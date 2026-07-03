import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import { createClimb, deleteClimb, getClimbWithDetails } from '../services/climbService';
import { notifyLike, notifyComment, notifyCongratulation } from '../services/notificationService';
import type { AuthenticatedRequest } from '../types';
import { ClimbResult } from '@prisma/client';

const router = Router();

const createClimbSchema = z.object({
  routeId: z.string(),
  gymId: z.string(),
  sessionId: z.string().optional(),
  result: z.nativeEnum(ClimbResult),
  attempts: z.number().int().min(1).default(1),
  date: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  difficultyRating: z.number().int().min(1).max(5).optional(),
  enjoymentRating: z.number().int().min(1).max(5).optional(),
  isCompetitionSend: z.boolean().optional(),
  agreeWithGrade: z.boolean().optional(),
  perceivedGrade: z.string().optional(),
  isPublic: z.boolean().default(true),
});

const updateClimbSchema = z.object({
  notes: z.string().max(2000).optional(),
  difficultyRating: z.number().int().min(1).max(5).optional(),
  enjoymentRating: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const congratSchema = z.object({
  message: z.string().max(200).optional(),
});

// POST / - log a climb
router.post('/', authenticate, validate(createClimbSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { date, ...rest } = req.body;
    const result = await createClimb({
      userId,
      ...rest,
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as AuthenticatedRequest).user.id;
    const climb = await getClimbWithDetails(req.params.id, viewerId);
    if (!climb) throw new AppError(404, 'Climb not found');
    res.json({ success: true, data: climb });
  } catch (err) {
    next(err);
  }
});

// PUT /:id
router.put('/:id', authenticate, validate(updateClimbSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const climb = await prisma.climb.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!climb) throw new AppError(404, 'Climb not found');
    if (climb.userId !== userId) throw new AppError(403, 'Forbidden');

    const updated = await prisma.climb.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    await deleteClimb(req.params.id, userId);
    res.json({ success: true, message: 'Climb deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/like
router.post('/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const userName = (req as AuthenticatedRequest).user.displayName;
    const climbId = req.params.id;

    const climb = await prisma.climb.findUnique({ where: { id: climbId }, select: { userId: true, isPublic: true } });
    if (!climb) throw new AppError(404, 'Climb not found');
    if (!climb.isPublic && climb.userId !== userId) throw new AppError(403, 'Forbidden');

    // Use a transaction to prevent count drift: only increment if the like is newly created
    const existing = await prisma.like.findUnique({ where: { userId_climbId: { userId, climbId } } });
    if (!existing) {
      await prisma.$transaction([
        prisma.like.create({ data: { userId, climbId } }),
        prisma.climb.update({ where: { id: climbId }, data: { likeCount: { increment: 1 } } }),
      ]);
      setImmediate(() => notifyLike(climb.userId, userId, userName, climbId).catch(() => undefined));
    }

    res.json({ success: true, message: 'Liked' });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/like
router.delete('/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const climbId = req.params.id;

    // Only decrement if the like actually existed
    const existing = await prisma.like.findUnique({ where: { userId_climbId: { userId, climbId } } });
    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { userId_climbId: { userId, climbId } } }),
        prisma.climb.update({ where: { id: climbId }, data: { likeCount: { decrement: 1 } } }),
      ]);
    }

    res.json({ success: true, message: 'Unliked' });
  } catch (err) {
    next(err);
  }
});

// GET /:id/likes
router.get('/:id/likes', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { climbId: req.params.id },
        include: { user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.like.count({ where: { climbId: req.params.id } }),
    ]);
    res.json({ success: true, ...buildPaginationResponse(likes.map((l) => l.user), total, pagination) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/comments
router.get('/:id/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { climbId: req.params.id },
        include: { user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.comment.count({ where: { climbId: req.params.id } }),
    ]);
    res.json({ success: true, ...buildPaginationResponse(comments, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// POST /:id/comments
router.post('/:id/comments', authenticate, validate(commentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const userName = (req as AuthenticatedRequest).user.displayName;
    const climbId = req.params.id;

    const climb = await prisma.climb.findUnique({ where: { id: climbId }, select: { userId: true, isPublic: true } });
    if (!climb) throw new AppError(404, 'Climb not found');
    if (!climb.isPublic && climb.userId !== userId) throw new AppError(403, 'Forbidden');

    const content = req.body.content as string;

    // Atomically create comment and increment count
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: { userId, climbId, content },
        include: { user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } } },
      }),
      prisma.climb.update({ where: { id: climbId }, data: { commentCount: { increment: 1 } } }),
    ]);

    setImmediate(() => notifyComment(climb.userId, userId, userName, climbId, content).catch(() => undefined));

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/comments/:commentId
router.delete('/:id/comments/:commentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) throw new AppError(404, 'Comment not found');

    const climb = await prisma.climb.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (comment.userId !== userId && climb?.userId !== userId) throw new AppError(403, 'Forbidden');

    await prisma.$transaction([
      prisma.comment.delete({ where: { id: req.params.commentId } }),
      prisma.climb.update({ where: { id: req.params.id }, data: { commentCount: { decrement: 1 } } }),
    ]);

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/congratulate
router.post('/:id/congratulate', authenticate, validate(congratSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromUserId = (req as AuthenticatedRequest).user.id;
    const fromName = (req as AuthenticatedRequest).user.displayName;
    const climbId = req.params.id;

    const climb = await prisma.climb.findUnique({ where: { id: climbId }, select: { userId: true, isPublic: true } });
    if (!climb) throw new AppError(404, 'Climb not found');
    if (!climb.isPublic && climb.userId !== fromUserId) throw new AppError(403, 'Forbidden');

    const message = req.body.message as string | undefined;

    const congrat = await prisma.congratulation.upsert({
      where: { fromUserId_climbId: { fromUserId, climbId } },
      create: { fromUserId, toUserId: climb.userId, climbId, message },
      update: { message },
    });

    setImmediate(() => notifyCongratulation(climb.userId, fromUserId, fromName, climbId, message).catch(() => undefined));

    res.status(201).json({ success: true, data: congrat });
  } catch (err) {
    next(err);
  }
});

export default router;
