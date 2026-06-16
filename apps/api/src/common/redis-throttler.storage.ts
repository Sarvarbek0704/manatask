import { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

interface Record {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed rate-limit counter so limits hold across multiple API
 * instances (the default in-memory storage is per-process).
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<Record> {
    const k = `thr:${throttlerName}:${key}`;
    const totalHits = await this.redis.incr(k);
    if (totalHits === 1) await this.redis.pexpire(k, ttl);
    let ttlMs = await this.redis.pttl(k);
    if (ttlMs < 0) {
      await this.redis.pexpire(k, ttl);
      ttlMs = ttl;
    }
    const isBlocked = totalHits > limit;
    if (isBlocked && blockDuration > 0) {
      await this.redis.pexpire(k, blockDuration);
      ttlMs = blockDuration;
    }
    return {
      totalHits,
      timeToExpire: Math.ceil(ttlMs / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.ceil(ttlMs / 1000) : 0,
    };
  }
}
