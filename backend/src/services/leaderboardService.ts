import { prisma } from '../config/database';
import { redis } from '../config/redis';

export type LeaderboardMetric = 'sends_week' | 'sends_month' | 'hardest_send' | 'flash_rate' | 'streak' | 'climber_rating' | 'most_improved';
export type LeaderboardPeriod = 'week' | 'month' | 'all_time';

const CACHE_TTL = 300; // 5 minutes

function gradeNum(grade: string | null): number {
  if (!grade) return -1;
  if (grade === 'VB') return -1;
  const n = parseInt(grade.replace('V', ''), 10);
  return isNaN(n) ? -1 : n;
}

async function getSendsLeaderboard(period: LeaderboardPeriod, gymId?: string, userIds?: string[]) {
  const now = new Date();
  let dateFilter: Date | undefined;
  if (period === 'week') dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === 'month') dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: Record<string, unknown> = {
    result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] },
    ...(dateFilter && { date: { gte: dateFilter } }),
    ...(gymId && { gymId }),
    ...(userIds && { userId: { in: userIds } }),
    user: { privacy: { not: 'PRIVATE' } },
  };

  const groups = await prisma.climb.groupBy({
    by: ['userId'],
    where,
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 50,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((g) => g.userId) } },
    select: { id: true, username: true, displayName: true, profileImageUrl: true, climberRating: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return groups
    .filter((g) => userMap.has(g.userId))
    .map((g, idx) => ({
      rank: idx + 1,
      user: userMap.get(g.userId)!,
      value: g._count.userId,
      metric: 'sends',
    }));
}

async function getFlashRateLeaderboard(gymId?: string, userIds?: string[]) {
  const where: Record<string, unknown> = {
    result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] },
    ...(gymId && { gymId }),
    ...(userIds && { userId: { in: userIds } }),
    user: { privacy: { not: 'PRIVATE' } },
  };

  const groups = await prisma.climb.groupBy({
    by: ['userId', 'result'],
    where,
    _count: { result: true },
  });

  const byUser: Record<string, { sends: number; flashes: number }> = {};
  for (const g of groups) {
    if (!byUser[g.userId]) byUser[g.userId] = { sends: 0, flashes: 0 };
    byUser[g.userId].sends += g._count.result;
    if (['FLASH', 'ONSIGHT'].includes(g.result)) byUser[g.userId].flashes += g._count.result;
  }

  const entries = Object.entries(byUser)
    .filter(([, v]) => v.sends >= 5)
    .map(([userId, v]) => ({ userId, flashRate: Math.round((v.flashes / v.sends) * 1000) / 10 }))
    .sort((a, b) => b.flashRate - a.flashRate)
    .slice(0, 50);

  const users = await prisma.user.findMany({
    where: { id: { in: entries.map((e) => e.userId) } },
    select: { id: true, username: true, displayName: true, profileImageUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return entries.map((e, idx) => ({
    rank: idx + 1,
    user: userMap.get(e.userId)!,
    value: e.flashRate,
    metric: 'flash_rate_%',
  })).filter((e) => e.user);
}

async function getHardestSendLeaderboard(gymId?: string, userIds?: string[]) {
  const where: Record<string, unknown> = {
    result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'COMPETITION_SEND', 'PERSONAL_BEST'] },
    ...(gymId && { gymId }),
    ...(userIds && { userId: { in: userIds } }),
    user: { privacy: { not: 'PRIVATE' } },
  };

  const userSends = await prisma.climb.findMany({
    where,
    include: { route: { select: { grade: true } } },
  });

  const bestByUser: Record<string, string> = {};
  for (const climb of userSends) {
    const current = bestByUser[climb.userId];
    if (!current || gradeNum(climb.route.grade) > gradeNum(current)) {
      bestByUser[climb.userId] = climb.route.grade;
    }
  }

  const sorted = Object.entries(bestByUser)
    .sort((a, b) => gradeNum(b[1]) - gradeNum(a[1]))
    .slice(0, 50);

  const users = await prisma.user.findMany({
    where: { id: { in: sorted.map(([id]) => id) } },
    select: { id: true, username: true, displayName: true, profileImageUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return sorted.map(([userId, grade], idx) => ({
    rank: idx + 1,
    user: userMap.get(userId)!,
    value: grade,
    metric: 'hardest_send',
  })).filter((e) => e.user);
}

export async function getGlobalLeaderboard(metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const cacheKey = `leaderboard:global:${metric}:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let result;
  if (metric === 'sends_week' || metric === 'sends_month') {
    result = await getSendsLeaderboard(period);
  } else if (metric === 'flash_rate') {
    result = await getFlashRateLeaderboard();
  } else if (metric === 'hardest_send') {
    result = await getHardestSendLeaderboard();
  } else if (metric === 'streak') {
    const users = await prisma.user.findMany({
      where: { privacy: { not: 'PRIVATE' }, consistencyStreak: { gt: 0 } },
      select: { id: true, username: true, displayName: true, profileImageUrl: true, consistencyStreak: true },
      orderBy: { consistencyStreak: 'desc' },
      take: 50,
    });
    result = users.map((u, idx) => ({
      rank: idx + 1,
      user: { id: u.id, username: u.username, displayName: u.displayName, profileImageUrl: u.profileImageUrl },
      value: u.consistencyStreak,
      metric: 'streak_days',
    }));
  } else {
    const users = await prisma.user.findMany({
      where: { privacy: { not: 'PRIVATE' }, climberRating: { gt: 0 } },
      select: { id: true, username: true, displayName: true, profileImageUrl: true, climberRating: true },
      orderBy: { climberRating: 'desc' },
      take: 50,
    });
    result = users.map((u, idx) => ({
      rank: idx + 1,
      user: { id: u.id, username: u.username, displayName: u.displayName, profileImageUrl: u.profileImageUrl },
      value: u.climberRating,
      metric: 'climber_rating',
    }));
  }

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}

export async function getGymLeaderboard(gymId: string, metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const cacheKey = `leaderboard:gym:${gymId}:${metric}:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let result;
  if (metric === 'hardest_send') {
    result = await getHardestSendLeaderboard(gymId);
  } else if (metric === 'flash_rate') {
    result = await getFlashRateLeaderboard(gymId);
  } else {
    result = await getSendsLeaderboard(period, gymId);
  }

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}

export async function getFriendsLeaderboard(userId: string, metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const userIds = [userId, ...following.map((f) => f.followingId)];

  if (metric === 'hardest_send') {
    return getHardestSendLeaderboard(undefined, userIds);
  } else if (metric === 'flash_rate') {
    return getFlashRateLeaderboard(undefined, userIds);
  } else {
    return getSendsLeaderboard(period, undefined, userIds);
  }
}
