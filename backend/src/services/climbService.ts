import { ClimbResult, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { updateClimberRating } from '../utils/climberRating';
import { getClimbXP, getLevelFromXP } from '../utils/xp';
import { checkAndAwardAchievements } from './achievementService';
import { notifyFollowers } from './notificationService';
import { gradeToNumber } from '../types';

const SEND_RESULTS: ClimbResult[] = ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'];
const FLASH_RESULTS: ClimbResult[] = ['FLASH', 'ONSIGHT'];

interface CreateClimbInput {
  userId: string;
  routeId: string;
  gymId: string;
  sessionId?: string;
  result: ClimbResult;
  attempts: number;
  date: Date;
  notes?: string;
  difficultyRating?: number;
  enjoymentRating?: number;
  isCompetitionSend?: boolean;
  agreeWithGrade?: boolean;
  perceivedGrade?: string;
  isPublic?: boolean;
}

export async function createClimb(input: CreateClimbInput) {
  const route = await prisma.route.findUnique({
    where: { id: input.routeId },
    select: { id: true, grade: true, wallAngle: true, gymId: true },
  });

  if (!route) throw new Error('Route not found');

  const isSend = SEND_RESULTS.includes(input.result);
  const isFlash = FLASH_RESULTS.includes(input.result);

  const climb = await prisma.climb.create({
    data: {
      userId: input.userId,
      routeId: input.routeId,
      gymId: input.gymId,
      sessionId: input.sessionId,
      result: input.result,
      attempts: input.attempts,
      date: input.date,
      notes: input.notes,
      difficultyRating: input.difficultyRating,
      enjoymentRating: input.enjoymentRating,
      isCompetitionSend: input.isCompetitionSend ?? false,
      agreeWithGrade: input.agreeWithGrade,
      perceivedGrade: input.perceivedGrade,
      isPublic: input.isPublic ?? true,
    },
    include: {
      route: { include: { gym: { select: { id: true, name: true } } } },
      user: { select: { id: true, displayName: true, username: true, profileImageUrl: true } },
    },
  });

  // Update route aggregate stats
  await prisma.route.update({
    where: { id: input.routeId },
    data: {
      totalAttempts: { increment: input.attempts },
      ...(isSend && { totalSends: { increment: 1 } }),
      ...(isFlash && { flashCount: { increment: 1 } }),
    },
  });

  // Update user stats
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { hardestSend: true, hardestFlash: true, lastClimbDate: true, consistencyStreak: true, totalSends: true, totalAttempts: true, totalFlashes: true, xpPoints: true },
  });

  if (!user) throw new Error('User not found');

  const climbGradeNum = gradeToNumber(route.grade);
  const currentHardestSendNum = user.hardestSend ? gradeToNumber(user.hardestSend) : -2;
  const currentHardestFlashNum = user.hardestFlash ? gradeToNumber(user.hardestFlash) : -2;

  const newHardestSend = isSend && climbGradeNum > currentHardestSendNum ? route.grade : undefined;
  const newHardestFlash = isFlash && climbGradeNum > currentHardestFlashNum ? route.grade : undefined;

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastClimb = user.lastClimbDate ? new Date(user.lastClimbDate) : null;
  lastClimb?.setHours(0, 0, 0, 0);

  let newStreak = user.consistencyStreak;
  if (!lastClimb || lastClimb.getTime() < yesterday.getTime()) {
    newStreak = 1;
  } else if (lastClimb.getTime() === yesterday.getTime()) {
    newStreak += 1;
  }

  const xpEarned = getClimbXP(route.grade, input.result);
  const newXp = user.xpPoints + xpEarned;
  const newLevel = getLevelFromXP(newXp);

  const updatedUser = await prisma.user.update({
    where: { id: input.userId },
    data: {
      totalAttempts: { increment: input.attempts },
      ...(isSend && { totalSends: { increment: 1 } }),
      ...(isFlash && { totalFlashes: { increment: 1 } }),
      ...(newHardestSend && { hardestSend: newHardestSend }),
      ...(newHardestFlash && { hardestFlash: newHardestFlash }),
      lastClimbDate: new Date(),
      consistencyStreak: newStreak,
      longestStreak: { ...(newStreak > (user.consistencyStreak) ? { set: newStreak } : {}) },
      xpPoints: newXp,
      level: newLevel,
    },
  });

  // Update session stats
  if (input.sessionId) {
    await prisma.session.update({
      where: { id: input.sessionId },
      data: {
        climbCount: { increment: 1 },
        ...(isSend && { sendCount: { increment: 1 } }),
      },
    });
  }

  // Background: update climber rating, check achievements, notify followers
  setImmediate(async () => {
    try {
      await updateClimberRating(input.userId);
      await checkAndAwardAchievements(input.userId, {
        ...climb,
        route: { ...climb.route, wallAngle: climb.route.wallAngle },
      } as never);
      if (input.isPublic !== false) {
        await notifyFollowers(
          input.userId,
          updatedUser.displayName,
          climb.id,
          route.grade
        );
      }
    } catch (err) {
      process.stderr.write(`Background climb processing error: ${err}\n`);
    }
  });

  return { climb, xpEarned, newLevel };
}

export async function deleteClimb(climbId: string, userId: string): Promise<void> {
  const climb = await prisma.climb.findUnique({
    where: { id: climbId },
    include: { route: { select: { grade: true } } },
  });

  if (!climb) throw new Error('Climb not found');
  if (climb.userId !== userId) throw new Error('Unauthorized');

  const isSend = SEND_RESULTS.includes(climb.result);
  const isFlash = FLASH_RESULTS.includes(climb.result);

  await prisma.climb.delete({ where: { id: climbId } });

  // Decrement route stats
  await prisma.route.update({
    where: { id: climb.routeId },
    data: {
      totalAttempts: { decrement: climb.attempts },
      ...(isSend && { totalSends: { decrement: 1 } }),
      ...(isFlash && { flashCount: { decrement: 1 } }),
    },
  });

  // Decrement user stats
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalAttempts: { decrement: climb.attempts },
      ...(isSend && { totalSends: { decrement: 1 } }),
      ...(isFlash && { totalFlashes: { decrement: 1 } }),
    },
  });

  // Recalculate climber rating in background
  setImmediate(() => updateClimberRating(userId).catch(() => undefined));
}

export async function getClimbWithDetails(climbId: string, viewerId?: string) {
  const climb = await prisma.climb.findUnique({
    where: { id: climbId },
    include: {
      user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } },
      route: { include: { gym: { select: { id: true, name: true, city: true } }, wall: { select: { id: true, name: true, angle: true } } } },
      media: true,
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
    },
  });

  if (!climb) return null;

  return {
    ...climb,
    likeCount: climb._count.likes,
    commentCount: climb._count.comments,
    isLiked: viewerId ? climb.likes && climb.likes.length > 0 : false,
  };
}

export async function getFeedClimbs(
  userId: string,
  page: number,
  limit: number
): Promise<{ climbs: unknown[]; total: number }> {
  const followingIds = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const userIds = [userId, ...followingIds.map((f) => f.followingId)];

  const where: Prisma.ClimbWhereInput = {
    userId: { in: userIds },
    isPublic: true,
  };

  const [climbs, total] = await Promise.all([
    prisma.climb.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true, profileImageUrl: true } },
        route: { include: { gym: { select: { id: true, name: true, city: true } }, wall: { select: { name: true, angle: true } } } },
        media: { take: 3 },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.climb.count({ where }),
  ]);

  return {
    climbs: climbs.map((c) => ({
      ...c,
      likeCount: c._count.likes,
      commentCount: c._count.comments,
      isLiked: c.likes.length > 0,
    })),
    total,
  };
}
