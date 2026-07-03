import './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs';

import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import gymRoutes from './routes/gyms';
import routeRoutes from './routes/routes';
import climbRoutes from './routes/climbs';
import feedRoutes from './routes/feed';
import leaderboardRoutes from './routes/leaderboards';
import achievementRoutes from './routes/achievements';
import challengeRoutes from './routes/challenges';
import notificationRoutes from './routes/notifications';
import mediaRoutes from './routes/media';
import searchRoutes from './routes/search';

const app = express();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || '/tmp/csocial-uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS — only allow the configured frontend origin
const allowedOrigin = env.FRONTEND_URL;
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / non-browser requests (curl, Postman) only in development
    if (!origin) {
      return env.NODE_ENV === 'production' ? callback(new Error('CORS: origin required')) : callback(null, true);
    }
    if (origin === allowedOrigin) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP access logging — strip Authorization headers so tokens never appear in logs
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (_req, res) => env.NODE_ENV === 'test',
}));

// Static uploads (dev only — production should use S3/CDN)
if (env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(uploadDir));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Health check — verifies DB + Redis connectivity
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPong = await redis.ping();
    res.json({ status: 'ok', db: 'connected', redis: redisPong === 'PONG' ? 'connected' : 'degraded', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', timestamp: new Date().toISOString() });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/gyms', gymRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/climbs', climbRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/leaderboards', leaderboardRoutes);
app.use('/api/v1/achievements', achievementRoutes);
app.use('/api/v1/challenges', challengeRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/search', searchRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(env.PORT, async () => {
  try {
    await prisma.$connect();
    await redis.connect();
  } catch {
    // Non-fatal at startup — health check will surface degradation
  }
  process.stdout.write(`cSocial API listening on port ${env.PORT} [${env.NODE_ENV}]\n`);
});

// Graceful shutdown — 30-second hard limit so the process always exits
async function shutdown(signal: string) {
  process.stdout.write(`${signal} received — shutting down\n`);
  const timer = setTimeout(() => {
    process.stderr.write('Shutdown timed out — forcing exit\n');
    process.exit(1);
  }, 30_000);
  timer.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      redis.disconnect();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled rejections so the process doesn't silently die
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`Unhandled rejection: ${reason}\n`);
});

export default app;
