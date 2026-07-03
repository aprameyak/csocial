import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('error', (err) => {
  // Log to stderr without leaking internal details to stdout
  process.stderr.write(`Redis error: ${err.message}\n`);
});

redis.on('connect', () => {
  process.stdout.write('Redis connected\n');
});
