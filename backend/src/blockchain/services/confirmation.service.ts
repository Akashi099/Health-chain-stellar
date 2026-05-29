import { Injectable, Inject, Optional, Logger } from '@nestjs/common';

import type { RedisClientType } from 'redis';
import type {
  ConfirmationState,
  TxFinalityStatus,
} from '../types/soroban-tx.types';

/**
 * ConfirmationService
 *
 * Tracks per-transaction confirmation counts in Redis and determines
 * whether a transaction has reached the configured finality threshold.
 *
 * Configuration:
 *   SOROBAN_CONFIRMATION_DEPTH  – minimum confirmations before a tx is
 *                                  marked "final" (default: 1)
 */
@Injectable()
export class ConfirmationService {
  private readonly logger = new Logger(ConfirmationService.name);
  private readonly redis: RedisClientType;

  /** Minimum confirmations required to transition to "final". */
  readonly finalityThreshold: number;

  private readonly CONFIRM_PREFIX = 'tx-confirmations:';
  /** Keep confirmation counters for 24 h to handle late callbacks. */
  private readonly CONFIRM_TTL_SECONDS = 86_400;

  constructor(@Optional() @Inject('REDIS_CLIENT') redis?: RedisClientType) {
    this.finalityThreshold = Math.max(
      1,
      parseInt(process.env.SOROBAN_CONFIRMATION_DEPTH ?? '1', 10) || 1,
    );

    if (redis) {
      this.redis = redis;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const { createClient } = require('redis');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      this.redis = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });
    }
  }

  /**
   * Record incoming confirmations for a transaction and return the
   * updated finality state.
   *
   * Each call increments the stored counter by `incomingConfirmations`
   * (default 1). Once the total reaches `finalityThreshold` the status
   * transitions to "final".
   *
   * @param transactionHash - On-chain transaction hash
   * @param incomingConfirmations - Confirmations reported in this callback (≥1)
   * @returns Current confirmation state including resolved finality status
   */
  async recordConfirmations(
    transactionHash: string,
    incomingConfirmations = 1,
  ): Promise<ConfirmationState> {
    const key = `${this.CONFIRM_PREFIX}${transactionHash}`;

    // INCRBY is atomic – safe under concurrent callbacks
    const total = await this.redis.incrBy(key, incomingConfirmations);

    // Refresh TTL on every update so the key lives 24 h from the last callback
    await this.redis.expire(key, this.CONFIRM_TTL_SECONDS);

    const status: TxFinalityStatus =
      total >= this.finalityThreshold ? 'final' : 'confirmed';

    this.logger.log(
      `Confirmation recorded: tx=${transactionHash} total=${total}/${this.finalityThreshold} status=${status}`,
    );

    return {
      transactionHash,
      confirmations: total,
      finalityThreshold: this.finalityThreshold,
      status,
    };
  }

  /**
   * Read the current confirmation count for a transaction without modifying it.
   *
   * @param transactionHash - On-chain transaction hash
   * @returns Stored confirmation count (0 if not yet seen)
   */
  async getConfirmations(transactionHash: string): Promise<number> {
    const key = `${this.CONFIRM_PREFIX}${transactionHash}`;
    const raw = await this.redis.get(key);
    return raw ? parseInt(raw, 10) : 0;
  }
}
