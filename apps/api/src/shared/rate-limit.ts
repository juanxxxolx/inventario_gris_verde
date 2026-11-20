import type { Redis } from 'ioredis';
import { rateLimited, serviceUnavailable } from './errors';

export interface RateLimitState {
  count: number;
  ttlSeconds: number;
}

export class RateLimiter {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<RateLimitState> {
    try {
      const [rawCount, ttl] = await Promise.all([this.redis.get(key), this.redis.ttl(key)]);
      return {
        count: rawCount ? Number.parseInt(rawCount, 10) : 0,
        ttlSeconds: ttl > 0 ? ttl : 0,
      };
    } catch {
      throw serviceUnavailable();
    }
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    try {
      const results = await this.redis.multi().incr(key).expire(key, ttlSeconds).exec();
      const first = results?.[0];
      if (!first || first[0]) {
        throw serviceUnavailable();
      }
      const value = first[1];
      return typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    } catch (error) {
      if (error instanceof Error && error.name === 'AppError') {
        throw error;
      }
      throw serviceUnavailable();
    }
  }

  async assertBelow(key: string, limit: number): Promise<void> {
    const state = await this.get(key);
    if (state.count >= limit) {
      throw rateLimited(state.ttlSeconds > 0 ? state.ttlSeconds : 60);
    }
  }

  async consume(key: string, limit: number, ttlSeconds: number): Promise<void> {
    const count = await this.increment(key, ttlSeconds);
    if (count > limit) {
      throw rateLimited(ttlSeconds);
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      throw serviceUnavailable();
    }
  }

  async isDenied(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch {
      throw serviceUnavailable();
    }
  }

  async deny(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, '1', 'EX', Math.max(1, ttlSeconds));
    } catch {
      throw serviceUnavailable();
    }
  }
}
