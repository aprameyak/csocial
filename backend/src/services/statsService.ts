import { prisma } from '../config/database';
import { GRADES, gradeToNumber } from '../types';

export interface UserStats {
  totalSends: number;
  totalAttempts: number;
  totalFlashes: number;
  totalSessions: number;
  flashRate: number;
  avgAttemptsPerSend: number;
  hardestSend: string | null;
  hardestFlash: string | null;
  consistencyStreak: number;
  longestStreak: number;
  climberRating: number;
  xpPoints: number;
  level: number;
  sendsThisWeek: number;
  sendsThisMonth: number;
  favoriteGym: { id: string; name: string } | null;
  favoriteStyle: string | null;
  uniqueGyms: number;
}

export interface GradePyramidItem {
  grade: string;
  sends: number;
  flashes: number;
  attempts: number;
  completionRate: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  hasSend: boolean;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalSends: true,
      totalAttempts: true,
      totalFlashes: true,
      totalSessions: true,
      hardestSend: true,
      hardestFlash: true,
      consistencyStreak: true,
      longestStreak: true,
      climberRating: true,
      xpPoints: true,
      level: true,
    },
  });

  if (!user) throw new Error('User not found');

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sendsThisWeek, sendsThisMonth, gymGroups] = await Promise.all([
    prisma.climb.count({
      where: { userId, date: { gte: weekStart }, result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] } },
    }),
    prisma.climb.count({
      where: { userId, date: { gte: monthStart }, result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] } },
    }),
    prisma.climb.groupBy({
      by: ['gymId'],
      where: { userId },
      _count: { gymId: true },
      orderBy: { _count: { gymId: 'desc' } },
    }),
  ]);

  let favoriteGym = null;
  if (gymGroups.length > 0) {
    const gym = await prisma.gym.findUnique({
      where: { id: gymGroups[0].gymId },
      select: { id: true, name: true },
    });
    favoriteGym = gym;
  }

  const flashRate = user.totalSends > 0 ? user.totalFlashes / user.totalSends : 0;
  const avgAttemptsPerSend = user.totalSends > 0 ? user.totalAttempts / user.totalSends : 0;

  return {
    ...user,
    flashRate: Math.round(flashRate * 100) / 100,
    avgAttemptsPerSend: Math.round(avgAttemptsPerSend * 10) / 10,
    sendsThisWeek,
    sendsThisMonth,
    favoriteGym,
    favoriteStyle: null,
    uniqueGyms: gymGroups.length,
  };
}

export async function getGradePyramid(userId: string): Promise<GradePyramidItem[]> {
  const climbs = await prisma.climb.findMany({
    where: { userId },
    include: { route: { select: { grade: true } } },
  });

  const pyramid: Record<string, GradePyramidItem> = {};

  for (const grade of GRADES) {
    pyramid[grade] = { grade, sends: 0, flashes: 0, attempts: 0, completionRate: 0 };
  }

  for (const climb of climbs) {
    const grade = climb.route.grade;
    if (!pyramid[grade]) continue;

    pyramid[grade].attempts += 1;

    if (['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'].includes(climb.result)) {
      pyramid[grade].sends += 1;
    }

    if (['FLASH', 'ONSIGHT'].includes(climb.result)) {
      pyramid[grade].flashes += 1;
    }
  }

  return GRADES.map((grade) => {
    const item = pyramid[grade];
    item.completionRate = item.attempts > 0 ? Math.round((item.sends / item.attempts) * 100) : 0;
    return item;
  }).filter((item) => item.attempts > 0 || gradeToNumber(item.grade) <= 5);
}

export async function getClimbingCalendar(userId: string): Promise<CalendarDay[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

  const climbs = await prisma.climb.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { date: true, result: true },
  });

  const dayMap: Record<string, { count: number; hasSend: boolean }> = {};

  for (const climb of climbs) {
    const dateStr = climb.date.toISOString().split('T')[0];
    if (!dayMap[dateStr]) dayMap[dateStr] = { count: 0, hasSend: false };
    dayMap[dateStr].count += 1;
    if (['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'].includes(climb.result)) {
      dayMap[dateStr].hasSend = true;
    }
  }

  const result: CalendarDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      count: dayMap[dateStr]?.count ?? 0,
      hasSend: dayMap[dateStr]?.hasSend ?? false,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
