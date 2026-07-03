import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const now = new Date();

    const challenges = await prisma.challenge.findMany({
      where: {
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: {
        participants: { where: { userId }, select: { id: true, progress: true, isCompleted: true, joinedAt: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: challenges.map((c) => ({
        ...c,
        userProgress: c.participants[0] ?? null,
        participantCount: c._count.participants,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/user/active', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const active = await prisma.userChallenge.findMany({
      where: { userId, isCompleted: false },
      include: { challenge: true },
      orderBy: { joinedAt: 'desc' },
    });
    res.json({ success: true, data: active });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          where: { userId },
          select: { id: true, progress: true, isCompleted: true, joinedAt: true },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!challenge) throw new AppError(404, 'Challenge not found');

    res.json({
      success: true,
      data: {
        ...challenge,
        userProgress: challenge.participants[0] ?? null,
        participantCount: challenge._count.participants,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const challengeId = req.params.id;

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { id: true, isActive: true } });
    if (!challenge || !challenge.isActive) throw new AppError(404, 'Challenge not found or inactive');

    const participation = await prisma.userChallenge.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId },
      update: {},
    });

    res.status(201).json({ success: true, data: participation });
  } catch (err) {
    next(err);
  }
});

export default router;
