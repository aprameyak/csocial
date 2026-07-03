import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import { getFeedClimbs } from '../services/climbService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// GET / - social feed
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const pagination = parsePaginationParams(req);

    const { climbs, total } = await getFeedClimbs(userId, pagination.page, pagination.limit);
    res.json({ success: true, ...buildPaginationResponse(climbs, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// GET /discover - popular recent climbs
router.get('/discover', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const pagination = parsePaginationParams(req);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [climbs, total] = await Promise.all([
      prisma.climb.findMany({
        where: {
          isPublic: true,
          date: { gte: sevenDaysAgo },
          result: { in: ['FLASH', 'ONSIGHT', 'COMPLETED', 'COMPETITION_SEND', 'PERSONAL_BEST'] },
          userId: { not: userId },
          user: { privacy: { not: 'PRIVATE' } },
          likeCount: { gte: 0 },
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } },
          route: { include: { gym: { select: { id: true, name: true, city: true } } } },
          media: { take: 1 },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId }, select: { id: true } },
        },
        orderBy: [{ likeCount: 'desc' }, { date: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.climb.count({
        where: {
          isPublic: true,
          date: { gte: sevenDaysAgo },
          result: { in: ['FLASH', 'ONSIGHT', 'COMPLETED', 'COMPETITION_SEND', 'PERSONAL_BEST'] },
          userId: { not: userId },
          user: { privacy: { not: 'PRIVATE' } },
        },
      }),
    ]);

    res.json({
      success: true,
      ...buildPaginationResponse(
        climbs.map((c) => ({ ...c, likeCount: c._count.likes, commentCount: c._count.comments, isLiked: c.likes.length > 0 })),
        total,
        pagination
      ),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
