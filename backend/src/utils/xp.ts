import { ClimbResult } from '@prisma/client';
import { gradeToNumber } from '../types';

const RESULT_MULTIPLIERS: Record<ClimbResult, number> = {
  ATTEMPTED: 0.1,
  WORKING: 0.2,
  ALMOST: 0.3,
  PROJECT: 0.15,
  COMPLETED: 1.0,
  REPEAT: 0.5,
  FLASH: 1.5,
  ONSIGHT: 2.0,
  COMPETITION_SEND: 1.8,
  PERSONAL_BEST: 1.3,
};

export function getClimbXP(grade: string, result: ClimbResult): number {
  const gradeNum = gradeToNumber(grade);
  const baseXP = Math.max(5, (gradeNum + 1) * 10);
  const multiplier = RESULT_MULTIPLIERS[result] ?? 1;
  return Math.round(baseXP * multiplier);
}

export function getSessionXP(durationMinutes: number): number {
  if (durationMinutes < 30) return 0;
  if (durationMinutes < 60) return 10;
  if (durationMinutes < 120) return 25;
  if (durationMinutes < 180) return 50;
  return 75;
}

export function getLevelFromXP(xp: number): number {
  // Level 1 starts at 0 XP, uses exponential curve: level n requires n^2 * 100 XP total
  if (xp <= 0) return 1;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  return Math.min(level, 100);
}

export function getXPForNextLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

export function getXPForCurrentLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}
