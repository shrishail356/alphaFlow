import express from 'express';
import { decibelService } from '../services/decibel/decibel.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * GET /api/decibel/account-status
 * Check if user has Decibel account and balance
 */
router.get('/account-status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const walletAddress = req.user?.wallet_address;
    console.log('[Decibel Route] Account status check requested');
    console.log('[Decibel Route] User ID:', req.userId);
    console.log('[Decibel Route] Wallet address:', walletAddress);

    if (!walletAddress) {
      console.error('[Decibel Route] Wallet address not found in request');
      return res.status(400).json({ error: 'Wallet address not found' });
    }

    console.log('[Decibel Route] Calling decibelService.checkAccountStatus...');
    const status = await decibelService.checkAccountStatus(walletAddress);
    console.log('[Decibel Route] Status check completed, sending response:', JSON.stringify(status, null, 2));

    res.json(status);
  } catch (error: any) {
    console.error('[Decibel Route] Error checking Decibel account status:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    res.status(500).json({
      error: 'Failed to check Decibel account status',
      details: error.message,
    });
  }
});

export default router;

