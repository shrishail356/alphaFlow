import { Router } from 'express';
import { decibelPortfolioService } from '../services/decibel-portfolio.service';
import { DecibelAccountService } from '../services/decibel/decibel-account.service';

const router = Router();
const decibelAccountService = new DecibelAccountService();

// Helper to get primary subaccount address
async function getPrimarySubaccountAddress(ownerAddress: string): Promise<string | null> {
  try {
    const subaccounts = await decibelAccountService.getSubaccounts(ownerAddress);
    const primarySubaccount = subaccounts.find(sub => sub.is_primary && sub.is_active);
    return primarySubaccount?.subaccount_address || null;
  } catch (error) {
    console.error('[Rewards] Error getting primary subaccount:', error);
    return null;
  }
}

// Calculate reward points based on trading activity
function calculateRewardPoints(tradingData: {
  totalVolume: number;
  totalTrades: number;
  profitableTrades: number;
  totalPnL: number;
}): number {
  let points = 0;

  // Points from volume: 1 point per $100 traded
  points += Math.floor(tradingData.totalVolume / 100);

  // Points from trades: 5 points per trade
  points += tradingData.totalTrades * 5;

  // Bonus for profitable trades: 10 points per profitable trade
  points += tradingData.profitableTrades * 10;

  // Bonus for positive PnL: 1 point per $10 profit
  if (tradingData.totalPnL > 0) {
    points += Math.floor(tradingData.totalPnL / 10);
  }

  return Math.max(0, points);
}

// Get tier based on points
function getTier(points: number): { tier: string; nextTier: string; pointsToNext: number; progress: number } {
  const tiers = [
    { name: 'bronze', minPoints: 0, color: '#CD7F32' },
    { name: 'silver', minPoints: 1000, color: '#C0C0C0' },
    { name: 'gold', minPoints: 5000, color: '#FFD700' },
    { name: 'platinum', minPoints: 10000, color: '#E5E4E2' },
    { name: 'vip', minPoints: 50000, color: '#8B00FF' },
  ];

  let currentTier = tiers[0];
  let nextTier = tiers[1];

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].minPoints) {
      currentTier = tiers[i];
      nextTier = tiers[i + 1] || tiers[i];
      break;
    }
  }

  const pointsToNext = nextTier.minPoints - points;
  const progress = currentTier === nextTier 
    ? 100 
    : Math.min(100, ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100);

  return {
    tier: currentTier.name,
    nextTier: nextTier.name,
    pointsToNext: Math.max(0, pointsToNext),
    progress: Math.max(0, Math.min(100, progress)),
  };
}

/**
 * GET /api/rewards/points
 * Get user reward points and tier information
 */
router.get('/points', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    console.log('[Rewards] Calculating points for user:', user);

    // Get trades from both main wallet and subaccount
    const mainTrades = await decibelPortfolioService.getUserTradeHistory(user, { limit: 1000 });
    const primarySubaccountAddr = await getPrimarySubaccountAddress(user);
    let subaccountTrades: any[] = [];
    if (primarySubaccountAddr) {
      subaccountTrades = await decibelPortfolioService.getUserTradeHistory(primarySubaccountAddr, { limit: 1000 });
    }

    const allTrades = [...mainTrades, ...subaccountTrades];

    // Calculate trading metrics
    let totalVolume = 0;
    let totalPnL = 0;
    let profitableTrades = 0;

    allTrades.forEach((trade: any) => {
      const tradeValue = (trade.size || 0) * (trade.price || 0);
      totalVolume += tradeValue;
      totalPnL += trade.realized_pnl_amount || 0;
      if (trade.is_profit) {
        profitableTrades++;
      }
    });

    // Calculate points
    const points = calculateRewardPoints({
      totalVolume,
      totalTrades: allTrades.length,
      profitableTrades,
      totalPnL,
    });

    // Get tier information
    const tierInfo = getTier(points);

    console.log('[Rewards] Points calculated:', {
      points,
      tier: tierInfo.tier,
      totalVolume,
      totalTrades: allTrades.length,
      profitableTrades,
    });

    res.json({
      points,
      tier: tierInfo.tier,
      nextTier: tierInfo.nextTier,
      pointsToNext: tierInfo.pointsToNext,
      progress: tierInfo.progress,
      stats: {
        totalVolume,
        totalTrades: allTrades.length,
        profitableTrades,
        totalPnL,
        winRate: allTrades.length > 0 ? (profitableTrades / allTrades.length) * 100 : 0,
      },
    });
  } catch (error: any) {
    console.error('[Rewards] Error calculating points:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate reward points' });
  }
});

export default router;

