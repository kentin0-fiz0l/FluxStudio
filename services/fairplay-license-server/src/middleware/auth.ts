import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('No token provided in authorization header');
      return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token', { error: err.message });
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Attach user info to request
      (req as any).user = decoded as JWTPayload;
      logger.debug('Token verified', { userId: (decoded as JWTPayload).id });
      next();
    });
  } catch (error) {
    logger.error('Auth middleware error', { error });
    return res.status(500).json({ error: 'Authentication error' });
  }
};

export const validateSubscriptionTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const contentId = req.query.contentId || req.params.contentId;

    // TODO: Implement actual tier validation
    // For now, allow all authenticated users
    logger.debug('Subscription tier validation', { userId, contentId });
    next();
  } catch (error) {
    logger.error('Subscription validation error', { error });
    return res.status(500).json({ error: 'Subscription validation error' });
  }
};
