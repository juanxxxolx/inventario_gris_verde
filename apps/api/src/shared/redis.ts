import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import type { Env } from '../config/env';

export type RedisClient = Redis;

export interface RedisHandle {
  client: RedisClient;
  kind: 'redis' | 'memory';
  close(): Promise<void>;
}

export function createRedis(env: Env): RedisHandle {
  if (env.REDIS_URL) {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
    });

    return {
      client,
      kind: 'redis',
      async close(): Promise<void> {
        await client.quit();
      },
    };
  }

  const client = new RedisMock() as unknown as RedisClient;

  return {
    client,
    kind: 'memory',
    async close(): Promise<void> {
      client.disconnect();
    },
  };
}
