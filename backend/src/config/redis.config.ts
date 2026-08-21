import Redis from 'ioredis';

export const createRedisClient = (): Redis => {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

  redis.on('connect', () => {
    console.log('Successfully connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  return redis;
};
