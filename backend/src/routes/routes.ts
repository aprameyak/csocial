import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const createRouteSchema = z.object({
  gymId: z.string(),
  wallId: z.string().optional(),
  name: z.string().max(100).optional(),
  grade: z.string(),
  color: z.string(),
  setterName: z.string().optional(),
  dateSet: z.string().datetime().optional(),
  expectedRemoval: z.string().datetime().optional(),
  wallAngle: z.enum(['SLAB', 'VERTICAL', 'SLIGHT_OVERHANG', 'OVERHANG', 'STEEP', 'ROOF']).optional(),
  holdStyle: z.string().optional(),
  isCompetition: z.boolean().optional(),
  description: z.string().max(1000).optional(),
});

const ratingSchema = z.object({
  difficulty: z.number().int().min(1).max(5).optional(),
  fun: z.number().int().min(1).max(5).optional(),
  creativity: z.number().int().min(1).max(5).optional(),
  skinFriendly: z.number().int().min(1).max(5).optional(),
  quality: z.number().int().min(1).max(5).optional(),
  holdQuality: z.number().int().min(1).max(5).optional(),
  movementQuality: z.number().int().min(1).max(5).optional(),
  overall: z.number().int().min(1).max(5).optional(),
});

// GET /
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const { gymId, grade, wallAngle, isActive = 'true' } = req.query;

    const where: Record<string, unknown> = {
      ...(gymId && { gymId }),
      ...(grade && { grade }),
      ...(wallAngle && { wallAngle }),
      ...(isActive !== 'false' && { isActive: true }),
    };

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        include: { gym: { select: { id: true, name: true, city: true } }, wall: { select: { id: true, name: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { dateSet: 'desc' },
      }),
      prisma.route.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginationResponse(routes, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// POST /
router.post('/', authenticate, validate(createRouteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, dateSet: req.body.dateSet ? new Date(req.body.dateSet) : new Date(), expectedRemoval: req.body.expectedRemoval ? new Date(req.body.expectedRemoval) : undefined };
    const route = await prisma.route.create({ data, include: { gym: { select: { id: true, name: true } }, wall: { select: { id: true, name: true } } } });
    await prisma.gym.update({ where: { id: data.gymId }, data: { totalRoutes: { increment: 1 } } });
    res.status(201).json({ success: true, data: route });
  } catch (err) {
    next(err);
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as AuthenticatedRequest).user.id;
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: {
        gym: { select: { id: true, name: true, city: true, latitude: true, longitude: true } },
        wall: { select: { id: true, name: true, angle: true } },
        media: { take: 10, orderBy: { createdAt: 'desc' } },
        ratings: { where: { userId: viewerId } },
        _count: { select: { climbs: true, comments: true } },
      },
    });

    if (!route) throw new AppError(404, 'Route not found');

    // Flash rate
    const flashRate = route.totalSends > 0 ? Math.round((route.flashCount / route.totalSends) * 100) : 0;

    // User's best result on this route
    const userBest = await prisma.climb.findFirst({
      where: { userId: viewerId, routeId: req.params.id, result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] } },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: { ...route, flashRate, userBest, userRating: route.ratings[0] ?? null } });
  } catch (err) {
    next(err);
  }
});

// PUT /:id
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const route = await prisma.route.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: route });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id (soft delete)
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.route.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Route removed' });
  } catch (err) {
    next(err);
  }
});

// GET /:id/leaderboard
router.get('/:id/leaderboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const routeId = req.params.id;

    const bestSends = await prisma.climb.findMany({
      where: { routeId, result: { in: ['FLASH', 'ONSIGHT', 'COMPLETED', 'COMPETITION_SEND'] } },
      include: { user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } } },
      orderBy: [{ attempts: 'asc' }, { date: 'asc' }],
      take: 20,
      distinct: ['userId'],
    });

    res.json({ success: true, data: bestSends.map((s, i) => ({ rank: i + 1, ...s })) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/beta
router.get('/:id/beta', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [betaMedia, betaComments] = await Promise.all([
      prisma.media.findMany({
        where: { routeId: req.params.id, isBeta: true },
        include: { user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.comment.findMany({
        where: { routeId: req.params.id },
        include: { user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    res.json({ success: true, data: { media: betaMedia, comments: betaComments } });
  } catch (err) {
    next(err);
  }
});

// GET /:id/feed
router.get('/:id/feed', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const [climbs, total] = await Promise.all([
      prisma.climb.findMany({
        where: { routeId: req.params.id, isPublic: true },
        include: {
          user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } },
          media: { take: 1 },
          _count: { select: { likes: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { date: 'desc' },
      }),
      prisma.climb.count({ where: { routeId: req.params.id, isPublic: true } }),
    ]);

    res.json({ success: true, ...buildPaginationResponse(climbs, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// POST /:id/rate
router.post('/:id/rate', authenticate, validate(ratingSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const routeId = req.params.id;

    const rating = await prisma.rating.upsert({
      where: { userId_routeId: { userId, routeId } },
      create: { userId, routeId, ...req.body },
      update: req.body,
    });

    // Update route averages
    const ratings = await prisma.rating.findMany({ where: { routeId } });
    const avgFun = ratings.filter((r) => r.fun).reduce((s, r) => s + r.fun!, 0) / ratings.filter((r) => r.fun).length || null;
    const avgDifficulty = ratings.filter((r) => r.difficulty).reduce((s, r) => s + r.difficulty!, 0) / ratings.filter((r) => r.difficulty).length || null;
    const avgRating = ratings.filter((r) => r.overall).reduce((s, r) => s + r.overall!, 0) / ratings.filter((r) => r.overall).length || null;

    await prisma.route.update({
      where: { id: routeId },
      data: { avgFun: avgFun ?? undefined, avgDifficulty: avgDifficulty ?? undefined, avgRating: avgRating ?? undefined },
    });

    res.json({ success: true, data: rating });
  } catch (err) {
    next(err);
  }
});

export default router;
