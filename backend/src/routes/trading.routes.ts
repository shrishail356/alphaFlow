import express from 'express';
import { decibelTradingService } from '../services/decibel-trading.service';
import { decibelService } from '../services/decibel/decibel.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../clients/db';
import { decibelClient, getDecibelHeaders } from '../services/decibel/decibel-client';

const router = express.Router();

/**
 * GET /api/trading/backend-address
 * Get backend wallet address for delegation
 */
router.get('/backend-address', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const backendAddress = decibelTradingService.getBackendAddress();
    
    if (!backendAddress) {
      return res.status(500).json({
        error: 'Backend wallet not configured',
      });
    }

    res.json({ backendAddress });
  } catch (error: any) {
    console.error('[Trading Route] Error getting backend address:', error);
    res.status(500).json({
      error: 'Failed to get backend address',
      details: error.message,
    });
  }
});

/**
 * GET /api/trading/delegation/status
 * Check if user has delegated trading permissions to backend
 */
router.get('/delegation/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const walletAddress = req.user?.wallet_address;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    // Get user's subaccounts
    const subaccounts = await decibelService.getSubaccounts(walletAddress);
    if (!subaccounts || subaccounts.length === 0) {
      return res.json({
        isDelegated: false,
        hasSubaccount: false,
        message: 'No subaccount found',
      });
    }

    const subaccount = subaccounts.find(s => s.is_primary) || subaccounts[0];
    const subaccountAddr = subaccount.subaccount_address;

    // Get backend address
    const backendAddress = decibelTradingService.getBackendAddress();
    if (!backendAddress) {
      return res.status(500).json({ error: 'Backend wallet not configured' });
    }

    // Check delegations from Decibel API
    try {
      const url = '/api/v1/delegations';
      const response = await decibelClient.get(url, {
        params: { subaccount: subaccountAddr },
        headers: getDecibelHeaders(true),
      });

      const delegations = response.data || [];
      const isDelegated = delegations.some(
        (d: any) => d.delegated_account?.toLowerCase() === backendAddress.toLowerCase()
      );

      res.json({
        isDelegated,
        hasSubaccount: true,
        subaccountAddr,
        backendAddress,
        delegations: delegations.map((d: any) => ({
          delegatedAccount: d.delegated_account,
          expirationTime: d.expiration_time_s,
          permissionType: d.permission_type,
        })),
      });
    } catch (error: any) {
      // If API returns 404, no delegations exist
      if (error.response?.status === 404) {
        return res.json({
          isDelegated: false,
          hasSubaccount: true,
          subaccountAddr,
          backendAddress,
          delegations: [],
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('[Trading Route] Error checking delegation status:', error);
    res.status(500).json({
      error: 'Failed to check delegation status',
      details: error.message,
    });
  }
});

/**
 * POST /api/trading/delegation/build
 * Build delegation transaction for user to sign
 */
router.post('/delegation/build', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { subaccountAddr } = req.body;
    const walletAddress = req.user?.wallet_address;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    if (!subaccountAddr) {
      return res.status(400).json({ error: 'Subaccount address is required' });
    }

    const backendAddress = decibelTradingService.getBackendAddress();
    if (!backendAddress) {
      return res.status(500).json({ error: 'Backend wallet not configured' });
    }

    const result = await decibelTradingService.buildDelegationTransaction(
      walletAddress,
      subaccountAddr
    );

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Return transaction data for frontend to sign
    res.json({
      transaction: result.transaction,
      backendAddress: result.backendAddress,
      message: 'Sign this transaction in your wallet to delegate trading permissions',
    });
  } catch (error: any) {
    console.error('[Trading Route] Error building delegation:', error);
    res.status(500).json({
      error: 'Failed to build delegation transaction',
      details: error.message,
    });
  }
});

/**
 * POST /api/trading/order/build
 * Build order transaction for user to sign (direct signing, no delegation needed)
 */
router.post('/order/build', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      marketName,
      price,
      size,
      side, // 'buy' or 'sell'
      orderType, // 'market' or 'limit'
      slPrice,
      tpPrice,
      clientOrderId,
    } = req.body;

    const walletAddress = req.user?.wallet_address;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    // Validate required fields
    if (!marketName || !size || !side) {
      return res.status(400).json({
        error: 'Missing required fields: marketName, size, side',
      });
    }

    // Get user's subaccount
    const subaccounts = await decibelService.getSubaccounts(walletAddress);
    if (!subaccounts || subaccounts.length === 0) {
      return res.status(400).json({
        error: 'No subaccount found. Please create a subaccount first.',
      });
    }

    const subaccount = subaccounts.find(s => s.is_primary) || subaccounts[0];
    const subaccountAddr = subaccount.subaccount_address;

    // Get market info
    const markets = await decibelService.getMarkets();
    const market = markets.find(m => m.market_name === marketName);
    if (!market) {
      return res.status(400).json({ error: `Market ${marketName} not found` });
    }

    // Get current market price for market orders
    let executionPrice = price;
    if (orderType === 'market') {
      const prices = await decibelService.getMarketPrices();
      const marketPrice = prices.find(p => {
        const m = markets.find(m => m.market_addr === p.market);
        return m?.market_name === marketName;
      });

      if (!marketPrice) {
        return res.status(400).json({ error: 'Could not fetch market price' });
      }
      executionPrice = marketPrice.mark_px;
    }

    if (!executionPrice) {
      return res.status(400).json({ error: 'Price is required for limit orders' });
    }

    // Build transaction data (user will sign this on frontend)
    const transactionData = await decibelTradingService.buildOrderTransaction({
      subaccountAddr,
      marketName,
      price: executionPrice,
      size,
      isBuy: side.toLowerCase() === 'buy',
      orderType: orderType || 'limit',
      slPrice,
      tpPrice,
      clientOrderId,
    });

    if (!transactionData.success) {
      return res.status(400).json({
        error: transactionData.error || 'Failed to build order transaction',
      });
    }

    res.json({
      transaction: transactionData.transaction,
      marketInfo: {
        marketName,
        marketAddr: market.market_addr,
        price: executionPrice,
        size,
        side,
        orderType: orderType || 'limit',
      },
      message: 'Sign this transaction in your wallet to place the order',
    });
  } catch (error: any) {
    console.error('[Trading Route] Error building order transaction:', error);
    res.status(500).json({
      error: 'Failed to build order transaction',
      details: error.message,
    });
  }
});

/**
 * POST /api/trading/execute
 * Execute a trade using delegated permissions (legacy - for backward compatibility)
 */
router.post('/execute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      marketName,
      price,
      size,
      side, // 'buy' or 'sell'
      orderType, // 'market' or 'limit'
      slPrice,
      tpPrice,
      leverage,
      clientOrderId,
    } = req.body;

    const walletAddress = req.user?.wallet_address;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    // Validate required fields
    if (!marketName || !size || !side) {
      return res.status(400).json({
        error: 'Missing required fields: marketName, size, side',
      });
    }

    // Get user's subaccount
    const subaccounts = await decibelService.getSubaccounts(walletAddress);
    if (!subaccounts || subaccounts.length === 0) {
      return res.status(400).json({
        error: 'No subaccount found. Please create a subaccount first.',
      });
    }

    const subaccount = subaccounts.find(s => s.is_primary) || subaccounts[0];
    const subaccountAddr = subaccount.subaccount_address;

    // Get current market price for market orders
    let executionPrice = price;
    if (orderType === 'market') {
      const markets = await decibelService.getMarkets();
      const market = markets.find(m => m.market_name === marketName);
      if (!market) {
        return res.status(400).json({ error: `Market ${marketName} not found` });
      }

      const prices = await decibelService.getMarketPrices();
      const marketPrice = prices.find(p => {
        const m = markets.find(m => m.market_addr === p.market);
        return m?.market_name === marketName;
      });

      if (!marketPrice) {
        return res.status(400).json({ error: 'Could not fetch market price' });
      }

      // Use mark price for market orders
      executionPrice = marketPrice.mark_px;
    }

    if (!executionPrice) {
      return res.status(400).json({ error: 'Price is required for limit orders' });
    }

    // Determine time in force
    let timeInForce: 0 | 1 | 2 = 0; // GoodTillCanceled
    if (orderType === 'market') {
      timeInForce = 2; // ImmediateOrCancel
    }

    // Place order
    const result = await decibelTradingService.placeOrder({
      subaccountAddr,
      marketName,
      price: executionPrice,
      size,
      isBuy: side.toLowerCase() === 'buy',
      timeInForce,
      isReduceOnly: false,
      clientOrderId: clientOrderId || `ai-${Date.now()}`,
      slTriggerPrice: slPrice || undefined,
      slLimitPrice: slPrice || undefined,
      tpTriggerPrice: tpPrice || undefined,
      tpLimitPrice: tpPrice || undefined,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to execute trade',
      });
    }

    // Save trade to database
    try {
      const userResult = await pool.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [walletAddress]
      );
      const userId = userResult.rows[0]?.id;

      if (userId) {
        await pool.query(
          `INSERT INTO trades (
            user_id, trade_type, side, asset, amount, price, total_value,
            order_type, status, decibel_tx_hash, ai_reasoning, ai_confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            userId,
            'ai', // AI-executed trade
            side.toLowerCase(),
            marketName,
            size,
            executionPrice,
            size * executionPrice,
            orderType || 'limit',
            'submitted', // Will be updated when filled
            result.transactionHash,
            'AI Trading Assistant', // Can be enhanced with actual reasoning
            0.75, // Default confidence
          ]
        );
      }
    } catch (dbError: any) {
      console.error('[Trading Route] Error saving trade to database:', dbError);
      // Don't fail the request if DB save fails
    }

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      orderId: result.orderId,
      message: 'Trade executed successfully',
    });
  } catch (error: any) {
    console.error('[Trading Route] Error executing trade:', error);
    res.status(500).json({
      error: 'Failed to execute trade',
      details: error.message,
    });
  }
});

export default router;

