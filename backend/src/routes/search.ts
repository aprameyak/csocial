import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string)?.trim();
    const type = (req.query.type as string) || 'all';

    if (!q || q.length < 1) throw new AppError(400, 'Search query required');
    if (q.length > 100) throw new AppError(400, 'Search query too long');
    if (!['all', 'users', 'gyms', 'routes'].includes(type)) throw new AppError(400, 'Invalid type');

    const results: Record<string, unknown[]> = {};

    if (type === 'all' || type === 'users') {
      results.users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
          privacy: { not: 'PRIVATE' },
        },
        select: { id: true, username: true, displayName: true, profileImageUrl: true, climberRating: true, hardestSend: true },
        take: 10,
      });
    }

    if (type === 'all' || type === 'gyms') {
      results.gyms = await prisma.gym.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        select: { id: true, name: true, city: true, state: true, country: true, imageUrl: true, isVerified: true, totalRoutes: true },
        take: 10,
      });
    }

    if (type === 'all' || type === 'routes') {
      results.routes = await prisma.route.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { grade: { contains: q, mode: 'insensitive' } },
            { setterName: { contains: q, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        include: { gym: { select: { id: true, name: true } } },
        take: 10,
      });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

export default router;
