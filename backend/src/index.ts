import './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
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
const uploadDir = '/tmp/csocial-uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static uploads (dev only)
app.use('/uploads', express.static(uploadDir));

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
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
    console.log('✅ Database connected');
    await redis.connect();
  } catch (err) {
    console.warn('⚠️  Could not connect to Redis:', err);
  }
  console.log(`🚀 cSocial API running on port ${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   API base: http://localhost:${env.PORT}/api/v1`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
