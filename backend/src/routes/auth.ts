import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, displayName } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      throw new AppError(409, `This ${field} is already taken`);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { username, email, passwordHash, displayName },
      select: { id: true, username: true, email: true, displayName: true, profileImageUrl: true, climberRating: true, xpPoints: true, level: true, createdAt: true },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, displayName: true, profileImageUrl: true, passwordHash: true, climberRating: true, xpPoints: true, level: true, consistencyStreak: true },
    });

    if (!user) throw new AppError(401, 'Invalid email or password');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const { passwordHash: _, ...userWithoutPassword } = user;

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ success: true, data: { user: userWithoutPassword, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, username: true, email: true, displayName: true, profileImageUrl: true, climberRating: true, xpPoints: true, level: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }

    const accessToken = generateAccessToken(stored.userId);
    const newRefreshToken = generateRefreshToken(stored.userId);

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { token: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({ success: true, data: { user: stored.user, accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError(400, 'Email is required');

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    // Always return success to prevent email enumeration
    if (user) {
      const token = uuidv4();
      await redis.setex(`reset:${token}`, 3600, user.id);
      // TODO: Send reset email via transactional email provider (SendGrid / Resend)
      // Do NOT log the token — it is a credential
    }

    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError(400, 'Token and password are required');
    if (password.length < 8) throw new AppError(400, 'Password must be at least 8 characters');

    const userId = await redis.get(`reset:${token}`);
    if (!userId) throw new AppError(400, 'Invalid or expired reset token');

    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await redis.del(`reset:${token}`);
    await prisma.refreshToken.deleteMany({ where: { userId } });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
