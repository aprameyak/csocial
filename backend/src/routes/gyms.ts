import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import { getGymLeaderboard } from '../services/leaderboardService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const createGymSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  website: z.string().url().max(500).optional(),
  phone: z.string().max(30).optional(),
  instagram: z.string().max(100).optional(),
  imageUrl: z.string().url().max(500).optional(),
});

const updateGymSchema = createGymSchema.partial();

// GET / - list gyms
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const { city, country, q } = req.query;

    const where: Record<string, unknown> = {
      isActive: true,
      ...(city && { city: { contains: city as string, mode: 'insensitive' } }),
      ...(country && { country: { contains: country as string, mode: 'insensitive' } }),
      ...(q && { OR: [
        { name: { contains: q as string, mode: 'insensitive' } },
        { city: { contains: q as string, mode: 'insensitive' } },
      ]}),
    };

    const [gyms, total] = await Promise.all([
      prisma.gym.findMany({
        where,
        select: { id: true, name: true, city: true, state: true, country: true, imageUrl: true, isVerified: true, totalRoutes: true, totalSends: true, latitude: true, longitude: true },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
      }),
      prisma.gym.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginationResponse(gyms, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// GET /nearby
router.get('/nearby', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radius = '50' } = req.query;
    if (!lat || !lng) throw new AppError(400, 'lat and lng are required');

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);

    // Approximate bounding box (1 degree lat ≈ 111km)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    const gyms = await prisma.gym.findMany({
      where: {
        isActive: true,
        latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
      },
      select: { id: true, name: true, city: true, state: true, country: true, imageUrl: true, isVerified: true, latitude: true, longitude: true, totalRoutes: true },
      take: 20,
    });

    // Sort by distance
    const withDistance = gyms
      .filter((g) => g.latitude && g.longitude)
      .map((g) => {
        const dlat = (g.latitude! - latitude) * Math.PI / 180;
        const dlng = (g.longitude! - longitude) * Math.PI / 180;
        const a = Math.sin(dlat/2)**2 + Math.cos(latitude * Math.PI/180) * Math.cos(g.latitude! * Math.PI/180) * Math.sin(dlng/2)**2;
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return { ...g, distance: Math.round(distance * 10) / 10 };
      })
      .sort((a, b) => a.distance - b.distance);

    res.json({ success: true, data: withDistance });
  } catch (err) {
    next(err);
  }
});

// POST /
router.post('/', authenticate, validate(createGymSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, address, city, state, country, latitude, longitude, website, phone, instagram, imageUrl } = req.body;
    const gym = await prisma.gym.create({
      data: { name, description, address, city, state, country, latitude, longitude, website, phone, instagram, imageUrl },
    });
    res.status(201).json({ success: true, data: gym });
  } catch (err) {
    next(err);
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as AuthenticatedRequest).user.id;
    const gym = await prisma.gym.findUnique({
      where: { id: req.params.id },
      include: {
        walls: { where: { isActive: true }, orderBy: { name: 'asc' } },
        _count: { select: { routes: true, checkIns: true, homeUsers: true } },
        checkIns: { where: { userId: viewerId }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!gym) throw new AppError(404, 'Gym not found');

    const userSendCount = await prisma.climb.count({
      where: { userId: viewerId, gymId: req.params.id, result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] } },
    });

    res.json({ success: true, data: { ...gym, userSendCount } });
  } catch (err) {
    next(err);
  }
});

// PUT /:id
router.put('/:id', authenticate, validate(updateGymSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.gym.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) throw new AppError(404, 'Gym not found');

    const { name, description, address, city, state, country, latitude, longitude, website, phone, instagram, imageUrl } = req.body;
    const gym = await prisma.gym.update({
      where: { id: req.params.id },
      data: { name, description, address, city, state, country, latitude, longitude, website, phone, instagram, imageUrl },
    });
    res.json({ success: true, data: gym });
  } catch (err) {
    next(err);
  }
});

// GET /:id/routes
router.get('/:id/routes', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const { grade, active = 'true', wallId } = req.query;

    const where: Record<string, unknown> = {
      gymId: req.params.id,
      ...(active !== 'false' && { isActive: true }),
      ...(grade && { grade: grade as string }),
      ...(wallId && { wallId: wallId as string }),
    };

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        include: {
          wall: { select: { id: true, name: true, angle: true } },
          _count: { select: { climbs: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ grade: 'asc' }, { dateSet: 'desc' }],
      }),
      prisma.route.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginationResponse(routes, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/walls
router.get('/:id/walls', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const walls = await prisma.wall.findMany({
      where: { gymId: req.params.id, isActive: true },
      include: { _count: { select: { routes: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: walls });
  } catch (err) {
    next(err);
  }
});

const VALID_METRICS = ['sends_week', 'sends_month', 'hardest_send', 'flash_rate', 'streak', 'climber_rating'] as const;
const VALID_PERIODS = ['week', 'month', 'all_time'] as const;
type ValidMetric = typeof VALID_METRICS[number];
type ValidPeriod = typeof VALID_PERIODS[number];

// GET /:id/leaderboard
router.get('/:id/leaderboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawMetric = (req.query.metric as string) || 'sends_week';
    const rawPeriod = (req.query.period as string) || 'week';
    if (!VALID_METRICS.includes(rawMetric as ValidMetric)) throw new AppError(400, 'Invalid metric');
    if (!VALID_PERIODS.includes(rawPeriod as ValidPeriod)) throw new AppError(400, 'Invalid period');
    const result = await getGymLeaderboard(req.params.id, rawMetric as ValidMetric, rawPeriod as ValidPeriod);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /:id/stats
router.get('/:id/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.id;

    const [routeCount, activeRouteCount, totalSends, uniqueClimbers] = await Promise.all([
      prisma.route.count({ where: { gymId } }),
      prisma.route.count({ where: { gymId, isActive: true } }),
      prisma.climb.count({
        where: { gymId, result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] } },
      }),
      prisma.climb.groupBy({ by: ['userId'], where: { gymId } }),
    ]);

    const gradeDistribution = await prisma.climb.groupBy({
      by: ['result'],
      where: { gymId },
      _count: { result: true },
    });

    res.json({
      success: true,
      data: { routeCount, activeRouteCount, totalSends, uniqueClimbers: uniqueClimbers.length, gradeDistribution },
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/check-in
router.post('/:id/check-in', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const gymId = req.params.id;

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) throw new AppError(404, 'Gym not found');

    const checkIn = await prisma.checkIn.create({ data: { userId, gymId } });
    res.status(201).json({ success: true, data: checkIn });
  } catch (err) {
    next(err);
  }
});

export default router;
