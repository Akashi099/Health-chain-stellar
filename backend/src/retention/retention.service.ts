import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import Redis from 'ioredis';
import { Repository, LessThan } from 'typeorm';

import { REDIS_CLIENT } from '../redis/redis.constants';
import { UserActivityEntity } from '../user-activity/entities/user-activity.entity';
import { SensitiveDataService } from './sensitive-data.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
    private readonly sensitiveDataService: SensitiveDataService,
  ) {}

  @Cron('0 2 * * *', {
    name: 'retention-job',
    timeZone: 'UTC',
  })
  async cleanupStaleData(): Promise<void> {
    this.logger.log(
      'Starting retention job for stale sessions, activity logs, and sensitive data',
    );

    try {
      const sessionsDeleted = await this.cleanupStaleSessions();
      const logsDeleted = await this.cleanupOldActivityLogs();
      const { redactionsProcessed, redactionsFailed } = await this.processSensitiveDataRedactions();

      this.logger.log(
        `Retention job completed: ${sessionsDeleted} sessions deleted, ${logsDeleted} activity logs deleted, ${redactionsProcessed} redactions processed, ${redactionsFailed} redactions failed`,
      );
    } catch (error) {
      this.logger.error('Retention job failed', error);
      throw error;
    }
  }

  private async cleanupStaleSessions(): Promise<number> {
    const ttlDays = this.configService.get<number>(
      'RETENTION_SESSION_TTL_DAYS',
      30,
    );
    const cutoffTime = Date.now() - ttlDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    const pattern = 'auth:session:*';
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    for await (const keys of stream) {
      for (const key of keys) {
        const session = await this.redis.hgetall(key as string);
        if (!session || Object.keys(session).length === 0) {
          continue;
        }

        const createdAt = session.createdAt
          ? new Date(session.createdAt).getTime()
          : null;
        const expiresAt = session.expiresAt
          ? new Date(session.expiresAt).getTime()
          : null;

        // Delete if expired or older than TTL
        if (
          (expiresAt && expiresAt < Date.now()) ||
          (createdAt && createdAt < cutoffTime)
        ) {
          const sessionId = (key as string).replace('auth:session:', '');
          const userId = session.userId as string | undefined;

          await this.redis.del(key as string);
          if (userId) {
            await this.redis.zrem(`auth:user-sessions:${userId}`, sessionId);
          }
          deletedCount++;
        }
      }
    }

    this.logger.debug(`Cleaned up ${deletedCount} stale sessions`);
    return deletedCount;
  }

  private async cleanupOldActivityLogs(): Promise<number> {
    const retentionDays = this.configService.get<number>(
      'RETENTION_ACTIVITY_LOG_DAYS',
      90,
    );
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.userActivityRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;
    this.logger.debug(`Cleaned up ${deletedCount} old activity logs`);
    return deletedCount;
  }

  /**
   * Process sensitive data redactions based on retention policies
   */
  private async processSensitiveDataRedactions(): Promise<{ redactionsProcessed: number; redactionsFailed: number }> {
    this.logger.debug('Processing sensitive data redactions');

    try {
      // Ensure default retention policies exist
      await this.sensitiveDataService.createDefaultRetentionPolicies();

      // Find data needing redaction
      const redactions = await this.sensitiveDataService.findDataNeedingRedaction();

      if (redactions.length > 0) {
        this.logger.log(`Found ${redactions.length} fields requiring redaction`);

        // Save redaction records
        await this.sensitiveDataService.saveRedactions(redactions);

        // Execute redactions
        const result = await this.sensitiveDataService.executeRedactions();
        return { redactionsProcessed: result.processed, redactionsFailed: result.failed };
      }

      return { redactionsProcessed: 0, redactionsFailed: 0 };
    } catch (error) {
      this.logger.error('Failed to process sensitive data redactions', error);
      return { redactionsProcessed: 0, redactionsFailed: 1 };
    }
  }

  /**
    * Manually trigger retention job (useful for testing or admin operations)
    */
  async triggerRetention(): Promise<{
    sessionsDeleted: number;
    logsDeleted: number;
    redactionsProcessed: number;
    redactionsFailed: number;
  }> {
    this.logger.log('Manual retention job triggered');

    const sessionsDeleted = await this.cleanupStaleSessions();
    const logsDeleted = await this.cleanupOldActivityLogs();
    const { redactionsProcessed, redactionsFailed } = await this.processSensitiveDataRedactions();

    return { sessionsDeleted, logsDeleted, redactionsProcessed, redactionsFailed };
  }
}
