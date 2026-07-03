import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const pagination = parsePaginationParams(req);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({ success: true, ...buildPaginationResponse(notifications, total, pagination), unreadCount });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    await prisma.notification.updateMany({ where: { id: req.params.id, userId }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
