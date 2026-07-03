import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthenticatedRequest } from '../types';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        profileImageUrl: true,
        climberRating: true,
        xpPoints: true,
        level: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, displayName: true, profileImageUrl: true, climberRating: true, xpPoints: true, level: true },
    }).then((user) => {
      if (user) (req as AuthenticatedRequest).user = user;
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}
