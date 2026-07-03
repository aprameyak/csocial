import { prisma } from '../config/database';
import { notifyAchievement } from './notificationService';
import { gradeToNumber } from '../types';
import type { Climb } from '@prisma/client';

interface AchievementCriteria {
  type: string;
  threshold?: number;
  grade?: string;
  angle?: string;
  min_attempts?: number;
}

async function awardAchievement(userId: string, achievementId: string, xpReward: number, name: string): Promise<void> {
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
  });
  if (existing) return;

  await prisma.userAchievement.create({ data: { userId, achievementId } });
  await prisma.user.update({
    where: { id: userId },
    data: { xpPoints: { increment: xpReward } },
  });
  await notifyAchievement(userId, name, xpReward);
}

export async function checkAndAwardAchievements(userId: string, newClimb: Climb & { route: { grade: string; wallAngle?: string | null } }): Promise<void> {
  const [user, allAchievements, userAchievements] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalSends: true, totalFlashes: true, totalSessions: true, consistencyStreak: true } }),
    prisma.achievement.findMany({ where: { isActive: true } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);

  if (!user) return;

  const earnedIds = new Set(userAchievements.map((ua) => ua.achievementId));
  const unearned = allAchievements.filter((a) => !earnedIds.has(a.id));

  for (const achievement of unearned) {
    const criteria = achievement.criteria as AchievementCriteria;
    let earned = false;

    switch (criteria.type) {
      case 'total_sends':
        earned = user.totalSends >= (criteria.threshold ?? 0);
        break;

      case 'total_flashes':
        earned = user.totalFlashes >= (criteria.threshold ?? 0);
        break;

      case 'total_sessions':
        earned = user.totalSessions >= (criteria.threshold ?? 0);
        break;

      case 'streak':
        earned = user.consistencyStreak >= (criteria.threshold ?? 0);
        break;

      case 'grade_send': {
        if (!criteria.grade) break;
        const isSend = ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'].includes(newClimb.result);
        earned = isSend && gradeToNumber(newClimb.route.grade) >= gradeToNumber(criteria.grade);
        break;
      }

      case 'grade_flash': {
        if (!criteria.grade) break;
        const isFlash = ['FLASH', 'ONSIGHT'].includes(newClimb.result);
        earned = isFlash && gradeToNumber(newClimb.route.grade) >= gradeToNumber(criteria.grade);
        break;
      }

      case 'wall_angle_sends': {
        if (!criteria.angle) break;
        const count = await prisma.climb.count({
          where: {
            userId,
            result: { in: ['COMPLETED', 'FLASH', 'ONSIGHT', 'REPEAT', 'COMPETITION_SEND', 'PERSONAL_BEST'] },
            route: { wallAngle: criteria.angle as never },
          },
        });
        earned = count >= (criteria.threshold ?? 0);
        break;
      }

      case 'long_project': {
        earned = newClimb.attempts >= (criteria.min_attempts ?? 10) &&
          ['COMPLETED', 'FLASH', 'ONSIGHT', 'COMPETITION_SEND', 'PERSONAL_BEST'].includes(newClimb.result);
        break;
      }

      case 'unique_gyms': {
        const gymCount = await prisma.climb.groupBy({
          by: ['gymId'],
          where: { userId },
        });
        earned = gymCount.length >= (criteria.threshold ?? 0);
        break;
      }
    }

    if (earned) {
      await awardAchievement(userId, achievement.id, achievement.xpReward, achievement.name);
    }
  }
}
