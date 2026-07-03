import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { xpReward: 'asc' }],
    });
    res.json({ success: true, data: achievements });
  } catch (err) {
    next(err);
  }
});

router.get('/user/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [earned, all] = await Promise.all([
      prisma.userAchievement.findMany({
        where: { userId: req.params.userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      prisma.achievement.findMany({ where: { isActive: true } }),
    ]);

    const earnedIds = new Set(earned.map((e) => e.achievementId));

    res.json({
      success: true,
      data: {
        earned: earned.map((e) => ({ ...e.achievement, unlockedAt: e.unlockedAt })),
        locked: all.filter((a) => !earnedIds.has(a.id)),
        total: all.length,
        earnedCount: earned.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
