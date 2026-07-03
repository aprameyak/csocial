import { prisma } from '../config/database';
import { gradeToNumber } from '../types';

// V-grade difficulty multipliers (exponential difficulty curve)
const GRADE_MULTIPLIERS: Record<number, number> = {
  [-1]: 0.1, // VB
  0: 1,      // V0
  1: 1.5,
  2: 2.2,
  3: 3.2,
  4: 4.5,
  5: 6.5,
  6: 9,
  7: 13,
  8: 18,
  9: 25,
  10: 35,
  11: 48,
  12: 65,
  13: 88,
  14: 120,
  15: 160,
  16: 210,
  17: 280,
};

function getGradeMultiplier(grade: string): number {
  const num = gradeToNumber(grade);
  return GRADE_MULTIPLIERS[num] ?? 0;
}

export async function calculateClimberRating(userId: string): Promise<number> {
  const climbs = await prisma.climb.findMany({
    where: { userId, result: { not: 'ATTEMPTED' } },
    include: { route: { select: { grade: true } } },
    orderBy: { date: 'desc' },
  });

  if (climbs.length === 0) return 0;

  const now = new Date();

  // 1. Hardest sends score (top 10 sends, weighted by grade)
  const sendGrades = climbs
    .filter((c) => ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'].includes(c.result))
    .map((c) => c.route.grade)
    .sort((a, b) => gradeToNumber(b) - gradeToNumber(a))
    .slice(0, 10);

  const hardestSendsScore = sendGrades.reduce((acc, grade, idx) => {
    return acc + getGradeMultiplier(grade) * Math.pow(0.85, idx);
  }, 0);

  // 2. Flash rate score
  const sends = climbs.filter((c) =>
    ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'].includes(c.result)
  );
  const flashes = climbs.filter((c) => ['FLASH', 'ONSIGHT'].includes(c.result));
  const flashRate = sends.length > 0 ? flashes.length / sends.length : 0;
  const flashScore = flashRate * 500;

  // 3. Volume score (log curve, diminishing returns)
  const volumeScore = Math.log10(Math.max(sends.length, 1)) * 100;

  // 4. Consistency score (sessions in last 90 days)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentSessions = await prisma.session.count({
    where: { userId, startTime: { gte: ninetyDaysAgo } },
  });
  const consistencyScore = Math.min(recentSessions * 5, 200);

  // 5. Grade diversity score (unique grades sent)
  const uniqueGrades = new Set(sends.map((c) => c.route.grade)).size;
  const diversityScore = uniqueGrades * 10;

  // 6. Recent activity decay (higher weight for recent climbs)
  const recentClimbs = climbs.filter((c) => {
    const daysAgo = (now.getTime() - c.date.getTime()) / (24 * 60 * 60 * 1000);
    return daysAgo <= 30;
  });
  const recencyBonus = recentClimbs.length > 0 ? 50 : 0;

  // 7. Improvement score (compare grade 3 months ago vs now)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oldSends = climbs.filter((c) => c.date < threeMonthsAgo);
  const oldMaxGrade = oldSends.length > 0
    ? Math.max(...oldSends.map((c) => gradeToNumber(c.route.grade)))
    : -1;
  const newSends = climbs.filter((c) => c.date >= threeMonthsAgo);
  const newMaxGrade = newSends.length > 0
    ? Math.max(...newSends.map((c) => gradeToNumber(c.route.grade)))
    : -1;
  const improvementScore = Math.max(0, (newMaxGrade - oldMaxGrade) * 30);

  const totalRating =
    hardestSendsScore * 0.40 +
    flashScore * 0.15 +
    volumeScore * 0.15 +
    consistencyScore * 0.10 +
    diversityScore * 0.05 +
    recencyBonus * 0.05 +
    improvementScore * 0.10;

  return Math.round(totalRating * 10) / 10;
}

export async function updateClimberRating(userId: string): Promise<void> {
  const rating = await calculateClimberRating(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { climberRating: rating },
  });
}
