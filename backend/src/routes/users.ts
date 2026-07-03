import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import { hashPassword, comparePassword } from '../utils/password';
import { getUserStats, getGradePyramid, getClimbingCalendar } from '../services/statsService';
import { notifyFollow } from '../services/notificationService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  homeGymId: z.string().optional().nullable(),
  location: z.string().max(100).optional(),
  yearsClimbing: z.number().int().min(0).max(50).optional(),
  height: z.number().int().min(100).max(250).optional(),
  apeIndex: z.number().int().min(-30).max(30).optional(),
  preferredStyle: z.string().optional(),
  currentProjectGrade: z.string().optional(),
  favoriteWallAngle: z.string().optional(),
  favoriteHoldType: z.string().optional(),
  privacy: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
});

// GET /me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true, displayName: true, bio: true,
        profileImageUrl: true, homeGymId: true, location: true, yearsClimbing: true,
        height: true, apeIndex: true, preferredStyle: true, currentProjectGrade: true,
        hardestSend: true, hardestFlash: true, gymGrade: true, outdoorGrade: true,
        favoriteWallAngle: true, favoriteHoldType: true, privacy: true,
        climberRating: true, xpPoints: true, level: true, consistencyStreak: true,
        longestStreak: true, totalSends: true, totalAttempts: true, totalFlashes: true,
        totalSessions: true, createdAt: true,
        homeGym: { select: { id: true, name: true, city: true } },
        _count: { select: { followers: true, following: true, achievements: true } },
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /me
router.put('/me', authenticate, validate(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: req.body,
      select: { id: true, username: true, displayName: true, bio: true, profileImageUrl: true, climberRating: true, xpPoints: true, level: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /me/password
router.put('/me/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) throw new AppError(400, 'Current and new passwords are required');
    if (newPassword.length < 8) throw new AppError(400, 'New password must be at least 8 characters');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new AppError(404, 'User not found');

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(401, 'Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /me
router.delete('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new AppError(404, 'User not found');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid password');

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /search
router.get('/search', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) { res.json({ success: true, data: [] }); return; }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
        privacy: { not: 'PRIVATE' },
      },
      select: { id: true, username: true, displayName: true, profileImageUrl: true, climberRating: true, hardestSend: true, _count: { select: { followers: true } } },
      take: 20,
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /:id
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as AuthenticatedRequest).user.id;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, displayName: true, bio: true, profileImageUrl: true,
        location: true, yearsClimbing: true, height: true, apeIndex: true,
        hardestSend: true, hardestFlash: true, gymGrade: true, outdoorGrade: true,
        preferredStyle: true, favoriteWallAngle: true, favoriteHoldType: true,
        privacy: true, climberRating: true, xpPoints: true, level: true,
        consistencyStreak: true, longestStreak: true, totalSends: true,
        totalAttempts: true, totalFlashes: true, totalSessions: true, createdAt: true,
        homeGym: { select: { id: true, name: true, city: true } },
        _count: { select: { followers: true, following: true, achievements: true } },
        followers: { where: { followerId: viewerId }, select: { id: true } },
      },
    });

    if (!user) throw new AppError(404, 'User not found');

    const { followers: viewerFollows, ...userWithoutFollows } = user;

    res.json({
      success: true,
      data: {
        ...userWithoutFollows,
        isFollowing: viewerFollows.length > 0,
        isOwnProfile: id === viewerId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id/stats
router.get('/:id/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getUserStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /:id/grade-pyramid
router.get('/:id/grade-pyramid', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pyramid = await getGradePyramid(req.params.id);
    res.json({ success: true, data: pyramid });
  } catch (err) {
    next(err);
  }
});

// GET /:id/calendar
router.get('/:id/calendar', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const calendar = await getClimbingCalendar(req.params.id);
    res.json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
});

// GET /:id/climbs
router.get('/:id/climbs', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as AuthenticatedRequest).user.id;
    const { id } = req.params;
    const pagination = parsePaginationParams(req);
    const { grade, result } = req.query;

    const where: Record<string, unknown> = {
      userId: id,
      ...(viewerId !== id && { isPublic: true }),
      ...(grade && { route: { grade: grade as string } }),
      ...(result && { result: result as string }),
    };

    const [climbs, total] = await Promise.all([
      prisma.climb.findMany({
        where,
        include: {
          route: { include: { gym: { select: { id: true, name: true } }, wall: { select: { name: true } } } },
          media: { take: 1 },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { date: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.climb.count({ where }),
    ]);

    res.json({ success: true, ...buildPaginationResponse(climbs, total, pagination) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/achievements
router.get('/:id/achievements', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [earned, all] = await Promise.all([
      prisma.userAchievement.findMany({
        where: { userId: req.params.id },
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
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id/followers
router.get('/:id/followers', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: req.params.id },
        include: { follower: { select: { id: true, username: true, displayName: true, profileImageUrl: true, climberRating: true } } },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.follow.count({ where: { followingId: req.params.id } }),
    ]);
    res.json({ success: true, ...buildPaginationResponse(followers.map((f) => f.follower), total, pagination) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/following
router.get('/:id/following', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePaginationParams(req);
    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: req.params.id },
        include: { following: { select: { id: true, username: true, displayName: true, profileImageUrl: true, climberRating: true } } },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.follow.count({ where: { followerId: req.params.id } }),
    ]);
    res.json({ success: true, ...buildPaginationResponse(following.map((f) => f.following), total, pagination) });
  } catch (err) {
    next(err);
  }
});

// POST /:id/follow
router.post('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = (req as AuthenticatedRequest).user.id;
    const followingId = req.params.id;
    const followerName = (req as AuthenticatedRequest).user.displayName;

    if (followerId === followingId) throw new AppError(400, 'Cannot follow yourself');

    const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
    if (!target) throw new AppError(404, 'User not found');

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });

    setImmediate(() => notifyFollow(followingId, followerId, followerName).catch(() => undefined));

    res.json({ success: true, message: 'Following' });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/follow
router.delete('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = (req as AuthenticatedRequest).user.id;
    const followingId = req.params.id;

    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    res.json({ success: true, message: 'Unfollowed' });
  } catch (err) {
    next(err);
  }
});

export default router;
