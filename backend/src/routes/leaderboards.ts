import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getGlobalLeaderboard, getGymLeaderboard, getFriendsLeaderboard } from '../services/leaderboardService';
import type { LeaderboardMetric, LeaderboardPeriod } from '../services/leaderboardService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const VALID_METRICS: LeaderboardMetric[] = ['sends_week', 'sends_month', 'hardest_send', 'flash_rate', 'streak', 'climber_rating', 'most_improved'];
const VALID_PERIODS: LeaderboardPeriod[] = ['week', 'month', 'all_time'];

function parseLeaderboardParams(req: Request): { metric: LeaderboardMetric; period: LeaderboardPeriod } {
  const rawMetric = (req.query.metric as string) || 'sends_week';
  const rawPeriod = (req.query.period as string) || 'week';
  if (!VALID_METRICS.includes(rawMetric as LeaderboardMetric)) throw new AppError(400, `Invalid metric. Allowed: ${VALID_METRICS.join(', ')}`);
  if (!VALID_PERIODS.includes(rawPeriod as LeaderboardPeriod)) throw new AppError(400, `Invalid period. Allowed: ${VALID_PERIODS.join(', ')}`);
  return { metric: rawMetric as LeaderboardMetric, period: rawPeriod as LeaderboardPeriod };
}

router.get('/global', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metric, period } = parseLeaderboardParams(req);
    const result = await getGlobalLeaderboard(metric, period);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/friends', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { metric, period } = parseLeaderboardParams(req);
    const result = await getFriendsLeaderboard(userId, metric, period);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/gym/:gymId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metric, period } = parseLeaderboardParams(req);
    const result = await getGymLeaderboard(req.params.gymId, metric, period);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
