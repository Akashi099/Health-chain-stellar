import { createHash } from 'crypto';

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RedisClientType } from 'redis';

/**
 * Job Deduplication Plugin
 *
 * Prevents queue bloat by suppressing duplicate job submissions within a time window.
 * Uses Redis to track recent job payloads and detect equivalent jobs submitted rapidly.
 *
 * Strategy:
 * 1. Compute deterministic hash of job payload (contractMethod + normalized args)
 * 2. Check Redis for recent hash within dedup window (default 10 seconds)
 * 3. Suppress duplicate if found, otherwise queue normally
 * 4. Store hash in Redis with TTL matching dedup window
 *
 * This avoids queue bloat while allowing legitimate batch resubmissions after the window expires.
 */
@Injectable()
export class JobDeduplicationPlugin {
  private readonly logger = new Logger(JobDeduplicationPlugin.name);
  private redis: RedisClientType;
  private readonly DEDUP_PREFIX = 'job-dedup:';
  private readonly DEDUP_WINDOW_MS = 10_000; // 10 seconds default
  private readonly DEDUP_TTL_SECONDS = Math.ceil(this.DEDUP_WINDOW_MS / 1000);

  constructor(
    private configService: ConfigService,
    @Optional() @Inject('REDIS_CLIENT') redis?: RedisClientType,
  ) {
    if (redis) {
      this.redis = redis;
    } else {
      // Lazy load Redis only if not provided (for testing)
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const { createClient } = require('redis');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      this.redis = createClient({
        socket: {
          host: this.configService.get<string>('REDIS_HOST') || 'localhost',
          port: this.configService.get<number>('REDIS_PORT') || 6379,
        },
      });
    }
  }

  /**
   * Compute deterministic hash of job payload.
   * Normalizes args to handle equivalent objects with different reference identities.
   *
   * @param contractMethod - Smart contract method name
   * @param args - Job arguments (normalized to canonical JSON)
   * @returns SHA256 hash of normalized payload
   */
  private computeJobHash(contractMethod: string, args: unknown[]): string {
    const normalized = {
      contractMethod,
      args: args.map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return JSON.parse(JSON.stringify(arg));
        }
        return arg;
      }),
    };

    const canonical = JSON.stringify(normalized);

    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Check if job is duplicate within dedup window and cache it.
   * Returns true if job is NEW, false if it's a DUPLICATE.
   *
   * @param contractMethod - Contract method name
   * @param args - Job arguments
   * @returns true if new (not recent duplicate), false if duplicate
   */
  async checkAndSetJobDedup(
    contractMethod: string,
    args: unknown[],
  ): Promise<boolean> {
    const jobHash = this.computeJobHash(contractMethod, args);
    const dedupKey = `${this.DEDUP_PREFIX}${jobHash}`;

    const exists = await this.redis.exists(dedupKey);
    if (exists === 1) {
      this.logger.debug(`Duplicate job suppressed: ${jobHash}`, {
        contractMethod,
      });
      return false; // Duplicate
    }

    // Store hash with TTL
    await this.redis.setEx(dedupKey, this.DEDUP_TTL_SECONDS, '1');
    this.logger.debug(`New job cached for dedup window: ${jobHash}`, {
      contractMethod,
      window: this.DEDUP_WINDOW_MS,
    });
    return true; // New
  }

  /**
   * Clear dedup cache for testing purposes.
   * Resets Redis dedup keys matching prefix.
   */
  async clearDedup(): Promise<void> {
    const keys = await this.redis.keys(`${this.DEDUP_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
      this.logger.debug(`Cleared ${keys.length} dedup cache entries`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
