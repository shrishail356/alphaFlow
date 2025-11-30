import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AccountAddress, Ed25519PublicKey } from '@aptos-labs/ts-sdk';
import { env } from '../config/env';
import { userService } from '../services/user.service';
import { photonClient } from '../clients/photon.client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Generate a simple JWT for Photon registration
// Based on Photon docs: "any secret works for demos"
// The JWT should contain user identity claims
function generatePhotonJWT(clientUserId: string, email?: string): string {
  // Simple payload - Photon accepts any JWT with user claims
  // Based on Postman example, we can use simple claims
  const payload: Record<string, unknown> = {
    sub: email || clientUserId, // Subject - use email if available, otherwise clientUserId
  };

  // Add email if provided
  if (email) {
    payload.email = email;
  }

  // Add name
  payload.name = clientUserId.substring(0, 8);

  // Use JWT_SECRET or a simple default (Photon docs say any secret works for demos)
  const secret = env.JWT_SECRET || 'alphaflow-demo-secret';

  return jwt.sign(payload, secret, { 
    expiresIn: '1h',
    algorithm: 'HS256'
  });
}

// Check if user exists by wallet address
router.post('/wallet-check', async (req, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400).json({ error: 'Missing wallet address' });
      return;
    }

    const user = await userService.findByWalletAddress(walletAddress);

    if (user) {
      // User exists, generate token and return
      const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '7d' });
      res.json({
        exists: true,
        token,
        user: {
          id: user.id,
          wallet_address: user.wallet_address,
          photon_identity_id: user.photon_identity_id,
          tier: user.tier,
          photon_points: user.photon_points,
          email: user.email,
          display_name: user.display_name
        }
      });
    } else {
      // User doesn't exist, return exists: false
      res.json({
        exists: false
      });
    }
  } catch (err) {
    console.error('Wallet check error:', err);
    res.status(500).json({ error: 'Check failed' });
  }
});

// Wallet login - create user with additional info
router.post('/wallet-login', async (req, res: Response) => {
  try {
    const { walletAddress, email, displayName, username } = req.body;

    if (!walletAddress) {
      res.status(400).json({ error: 'Missing wallet address' });
      return;
    }

    // Check if user already exists
    let user = await userService.findByWalletAddress(walletAddress);

    if (!user) {
      // Create new user with provided info
      user = await userService.createUser({
        wallet_address: walletAddress,
        wallet_type: 'petra',
        email: email || null,
        username: username || null
      });

      // Update display name if provided
      if (displayName) {
        await userService.updateUser(user.id, { display_name: displayName });
        user = await userService.findById(user.id);
      }
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user?.id }, env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user?.id,
        wallet_address: user?.wallet_address,
        photon_identity_id: user?.photon_identity_id,
        tier: user?.tier,
        photon_points: user?.photon_points,
        email: user?.email,
        display_name: user?.display_name
      }
    });
  } catch (err) {
    console.error('Wallet login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Photon onboarding - create embedded wallet (works for new users or existing users)
router.post('/photon-onboard', async (req, res: Response) => {
  try {
    const { email, displayName, username } = req.body;
    const authHeader = req.headers.authorization;
    let existingUser = null;

    // If user is logged in, try to get existing user
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
        existingUser = await userService.findById(decoded.userId);
      } catch {
        // Invalid token, treat as new user
      }
    }

    // If existing user has Photon wallet, return it
    if (existingUser?.photon_identity_id) {
      const token = jwt.sign({ userId: existingUser.id }, env.JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        token,
        wallet_address: existingUser.wallet_address,
        photon_identity_id: existingUser.photon_identity_id,
        user: {
          id: existingUser.id,
          wallet_address: existingUser.wallet_address,
          photon_identity_id: existingUser.photon_identity_id,
          tier: existingUser.tier,
          photon_points: existingUser.photon_points,
          email: existingUser.email,
          display_name: existingUser.display_name,
          username: existingUser.username
        }
      });
      return;
    }

    // Generate client_user_id for Photon (use email if available, otherwise generate)
    const clientUserId = email || `photon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Generate JWT for Photon with user info
    const photonJWT = generatePhotonJWT(clientUserId, email);

    // Register with Photon
    let photonResponse;
    try {
      photonResponse = await photonClient.registerUser(photonJWT, clientUserId);
    } catch (error: any) {
      console.error('Photon registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({ 
        error: 'Photon registration failed',
        details: error.message 
      });
      return;
    }

    // Extract wallet address and user ID from Photon response
    const walletAddress = photonResponse.data.wallet?.walletAddress;
    const photonUserId = photonResponse.data.user?.user?.id;

    if (!walletAddress) {
      console.error('Photon response missing wallet address:', JSON.stringify(photonResponse, null, 2));
      res.status(500).json({ error: 'Photon response missing wallet address' });
      return;
    }

    if (!photonUserId) {
      console.error('Photon response missing user ID:', JSON.stringify(photonResponse, null, 2));
      res.status(500).json({ error: 'Photon response missing user ID' });
      return;
    }

    // Create or update user
    let user;
    if (existingUser) {
      // Add Photon wallet to existing user
      user = await userService.updatePhotonIdentity(
        existingUser.id,
        photonUserId,
        walletAddress
      );
      // Update user info if provided
      if (email || displayName || username) {
        user = await userService.updateUser(existingUser.id, {
          email: email || undefined,
          display_name: displayName || undefined,
          username: username || undefined
        });
      }
    } else {
      // Check if user with this wallet address already exists (might have been created before)
      let existingWalletUser = await userService.findByWalletAddress(walletAddress);
      
      if (existingWalletUser) {
        // User exists, just update with Photon identity
        user = await userService.updatePhotonIdentity(
          existingWalletUser.id,
          photonUserId,
          walletAddress
        );
        // Update user info if provided
        if (email || displayName || username) {
          user = await userService.updateUser(existingWalletUser.id, {
            email: email || undefined,
            display_name: displayName || undefined,
            username: username || undefined
          });
        }
      } else {
        // Create new user with Photon wallet
        user = await userService.createUser({
          wallet_address: walletAddress,
          wallet_type: 'photon',
          email: email || undefined,
          username: username || undefined
        });

        // Update with Photon identity
        user = await userService.updatePhotonIdentity(
          user.id,
          photonUserId,
          walletAddress
        );
      }

      // Update display name if provided
      if (displayName) {
        user = await userService.updateUser(user.id, { display_name: displayName });
      }
    }

    // Generate JWT token for the user
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      wallet_address: walletAddress,
      photon_identity_id: photonUserId,
      access_token: photonResponse.data.tokens?.access_token,
      refresh_token: photonResponse.data.tokens?.refresh_token,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        photon_identity_id: user.photon_identity_id,
        tier: user.tier,
        photon_points: user.photon_points,
        email: user.email,
        display_name: user.display_name,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Photon onboard error:', err);
    res.status(500).json({ error: 'Photon onboarding failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await userService.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      wallet_address: user.wallet_address,
      photon_identity_id: user.photon_identity_id,
      tier: user.tier,
      photon_points: user.photon_points,
      is_signal_provider: user.is_signal_provider,
      email: user.email,
      display_name: user.display_name,
      username: user.username
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update current user
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { email, displayName, username } = req.body;
    const user = await userService.updateUser(req.userId, {
      email,
      display_name: displayName,
      username
    });

    res.json({
      id: user.id,
      wallet_address: user.wallet_address,
      photon_identity_id: user.photon_identity_id,
      tier: user.tier,
      photon_points: user.photon_points,
      is_signal_provider: user.is_signal_provider,
      email: user.email,
      display_name: user.display_name,
      username: user.username
    });
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;

