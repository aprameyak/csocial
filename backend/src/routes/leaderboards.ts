import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { getGlobalLeaderboard, getGymLeaderboard, getFriendsLeaderboard } from '../services/leaderboardService';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/global', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metric = (req.query.metric as string) || 'sends_week';
    const period = (req.query.period as string) || 'week';
    const result = await getGlobalLeaderboard(metric as never, period as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/friends', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const metric = (req.query.metric as string) || 'sends_week';
    const period = (req.query.period as string) || 'week';
    const result = await getFriendsLeaderboard(userId, metric as never, period as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/gym/:gymId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metric = (req.query.metric as string) || 'sends_week';
    const period = (req.query.period as string) || 'week';
    const result = await getGymLeaderboard(req.params.gymId, metric as never, period as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
