import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userService } from '../services/user.service';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    wallet_address: string;
    photon_identity_id: string | null;
    tier: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const user = await userService.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.userId = user.id;
    req.user = {
      id: user.id,
      wallet_address: user.wallet_address,
      photon_identity_id: user.photon_identity_id,
      tier: user.tier
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

