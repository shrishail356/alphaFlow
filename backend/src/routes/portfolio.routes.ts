import { Router } from 'express';
import { decibelPortfolioService } from '../services/decibel-portfolio.service';
import { DecibelAccountService } from '../services/decibel/decibel-account.service';

const decibelAccountService = new DecibelAccountService();

const router = Router();

// Helper to get primary subaccount address
async function getPrimarySubaccountAddress(ownerAddress: string): Promise<string | null> {
  try {
    const subaccounts = await decibelAccountService.getSubaccounts(ownerAddress);
    const primarySubaccount = subaccounts.find(sub => sub.is_primary && sub.is_active);
    return primarySubaccount?.subaccount_address || null;
  } catch (error) {
    console.error('[Portfolio] Error getting primary subaccount:', error);
    return null;
  }
}

// Helper to get account overview for both main wallet and subaccount
async function getCombinedAccountOverview(userAddress: string) {
  const mainOverview = await decibelAccountService.getAccountOverview(userAddress);
  const primarySubaccountAddr = await getPrimarySubaccountAddress(userAddress);
  
  let subaccountOverview = null;
  if (primarySubaccountAddr) {
    subaccountOverview = await decibelAccountService.getAccountOverview(primarySubaccountAddr);
  }

  // Combine balances
  const totalBalance = (mainOverview?.perp_equity_balance || 0) + (subaccountOverview?.perp_equity_balance || 0);
  const totalUnrealizedPnl = (mainOverview?.unrealized_pnl || 0) + (subaccountOverview?.unrealized_pnl || 0);
  const totalMargin = (mainOverview?.total_margin || 0) + (subaccountOverview?.total_margin || 0);
  const totalWithdrawable = (mainOverview?.usdc_cross_withdrawable_balance || 0) + (subaccountOverview?.usdc_cross_withdrawable_balance || 0);

  return {
    mainWallet: mainOverview,
    primarySubaccount: subaccountOverview,
    primarySubaccountAddress: primarySubaccountAddr,
    combined: {
      perp_equity_balance: totalBalance,
      unrealized_pnl: totalUnrealizedPnl,
      total_margin: totalMargin,
      usdc_cross_withdrawable_balance: totalWithdrawable,
      // Use subaccount data if available, otherwise main wallet
      cross_account_leverage_ratio: subaccountOverview?.cross_account_leverage_ratio || mainOverview?.cross_account_leverage_ratio,
      cross_margin_ratio: subaccountOverview?.cross_margin_ratio || mainOverview?.cross_margin_ratio,
      maintenance_margin: (mainOverview?.maintenance_margin || 0) + (subaccountOverview?.maintenance_margin || 0),
      unrealized_funding_cost: (mainOverview?.unrealized_funding_cost || 0) + (subaccountOverview?.unrealized_funding_cost || 0),
      // Performance metrics from subaccount if available
      volume: subaccountOverview?.volume || mainOverview?.volume,
      all_time_return: subaccountOverview?.all_time_return || mainOverview?.all_time_return,
      pnl_90d: subaccountOverview?.pnl_90d || mainOverview?.pnl_90d,
      sharpe_ratio: subaccountOverview?.sharpe_ratio || mainOverview?.sharpe_ratio,
      max_drawdown: subaccountOverview?.max_drawdown || mainOverview?.max_drawdown,
      weekly_win_rate_12w: subaccountOverview?.weekly_win_rate_12w || mainOverview?.weekly_win_rate_12w,
    },
  };
}

/**
 * GET /api/portfolio/overview
 * Get account overview for portfolio (main wallet + primary subaccount)
 */
router.get('/overview', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    console.log('[Portfolio] Fetching overview for user:', user);
    const overview = await getCombinedAccountOverview(user);
    console.log('[Portfolio] Overview fetched successfully');

    res.json(overview);
  } catch (error: any) {
    console.error('[Portfolio] Error fetching overview:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch account overview' });
  }
});

/**
 * GET /api/portfolio/positions
 * Get user positions (main wallet + primary subaccount)
 */
router.get('/positions', async (req, res) => {
  try {
    const { user, limit, includeDeleted, marketAddress } = req.query;
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    console.log('[Portfolio] Fetching positions for user:', user);
    
    // Get positions for main wallet
    const mainPositions = await decibelPortfolioService.getUserPositions(user, {
      limit: limit ? parseInt(limit as string) : undefined,
      includeDeleted: includeDeleted === 'true',
      marketAddress: marketAddress as string | undefined,
    });

    // Get positions for primary subaccount
    const primarySubaccountAddr = await getPrimarySubaccountAddress(user);
    let subaccountPositions: any[] = [];
    if (primarySubaccountAddr) {
      console.log('[Portfolio] Fetching positions for subaccount:', primarySubaccountAddr);
      subaccountPositions = await decibelPortfolioService.getUserPositions(primarySubaccountAddr, {
        limit: limit ? parseInt(limit as string) : undefined,
        includeDeleted: includeDeleted === 'true',
        marketAddress: marketAddress as string | undefined,
      });
    }

    // Combine and deduplicate positions
    const allPositions = [...mainPositions, ...subaccountPositions];
    console.log('[Portfolio] Total positions found:', allPositions.length);

    res.json(allPositions);
  } catch (error: any) {
    console.error('[Portfolio] Error fetching positions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch positions' });
  }
});

/**
 * GET /api/portfolio/trades
 * Get user trade history (main wallet + primary subaccount)
 */
router.get('/trades', async (req, res) => {
  try {
    const { user, limit, orderId, marketAddress } = req.query;
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    console.log('[Portfolio] Fetching trades for user:', user);
    
    // Get trades for main wallet
    const mainTrades = await decibelPortfolioService.getUserTradeHistory(user, {
      limit: limit ? parseInt(limit as string) : 100,
      orderId: orderId as string | undefined,
      marketAddress: marketAddress as string | undefined,
    });

    // Get trades for primary subaccount
    const primarySubaccountAddr = await getPrimarySubaccountAddress(user);
    let subaccountTrades: any[] = [];
    if (primarySubaccountAddr) {
      console.log('[Portfolio] Fetching trades for subaccount:', primarySubaccountAddr);
      subaccountTrades = await decibelPortfolioService.getUserTradeHistory(primarySubaccountAddr, {
        limit: limit ? parseInt(limit as string) : 100,
        orderId: orderId as string | undefined,
        marketAddress: marketAddress as string | undefined,
      });
    }

    // Combine and sort by timestamp (newest first)
    const allTrades = [...mainTrades, ...subaccountTrades].sort((a, b) => 
      (b.transaction_unix_ms || 0) - (a.transaction_unix_ms || 0)
    );
    console.log('[Portfolio] Total trades found:', allTrades.length);

    res.json(allTrades);
  } catch (error: any) {
    console.error('[Portfolio] Error fetching trades:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trade history' });
  }
});

/**
 * GET /api/portfolio/orders/open
 * Get user's open orders (main wallet + primary subaccount)
 */
router.get('/orders/open', async (req, res) => {
  try {
    const { user, limit } = req.query;
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    console.log('[Portfolio] Fetching open orders for user:', user);
    
    // Get open orders for main wallet
    const mainOrders = await decibelPortfolioService.getOpenOrders(
      user,
      limit ? parseInt(limit as string) : undefined
    );

    // Get open orders for primary subaccount
    const primarySubaccountAddr = await getPrimarySubaccountAddress(user);
    let subaccountOrders: any[] = [];
    if (primarySubaccountAddr) {
      console.log('[Portfolio] Fetching open orders for subaccount:', primarySubaccountAddr);
      subaccountOrders = await decibelPortfolioService.getOpenOrders(
        primarySubaccountAddr,
        limit ? parseInt(limit as string) : undefined
      );
    }

    // Combine orders
    const allOrders = [...mainOrders, ...subaccountOrders];
    console.log('[Portfolio] Total open orders found:', allOrders.length);

    res.json(allOrders);
  } catch (error: any) {
    console.error('[Portfolio] Error fetching open orders:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch open orders' });
  }
});

/**
 * GET /api/portfolio/orders/history
 * Get user order history (main wallet + primary subaccount)
 */
router.get('/orders/history', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    console.log('[Portfolio] Fetching order history for user:', user);
    
    // Get order history for main wallet
    const mainHistory = await decibelPortfolioService.getOrderHistory(user);

    // Get order history for primary subaccount
    const primarySubaccountAddr = await getPrimarySubaccountAddress(user);
    let subaccountHistory: { items: any[]; total_count: number } = { items: [], total_count: 0 };
    if (primarySubaccountAddr) {
      console.log('[Portfolio] Fetching order history for subaccount:', primarySubaccountAddr);
      subaccountHistory = await decibelPortfolioService.getOrderHistory(primarySubaccountAddr);
    }

    // Combine order histories
    const allItems: any[] = [...(mainHistory.items || []), ...(subaccountHistory.items || [])];
    const totalCount = (mainHistory.total_count || 0) + (subaccountHistory.total_count || 0);
    
    console.log('[Portfolio] Total order history items found:', allItems.length);

    res.json({ items: allItems, total_count: totalCount });
  } catch (error: any) {
    console.error('[Portfolio] Error fetching order history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch order history' });
  }
});

export default router;

