import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  FailedSorobanTxEntity,
  FailedSorobanTxStatus,
} from '../entities/failed-soroban-tx.entity';
import type { SorobanTxJob } from '../types/soroban-tx.types';

@Injectable()
export class FailedSorobanTxService {
  private readonly logger = new Logger(FailedSorobanTxService.name);

  constructor(
    @InjectRepository(FailedSorobanTxEntity)
    private readonly repo: Repository<FailedSorobanTxEntity>,
  ) {}

  /** Persist a permanently-failed transaction outbox row (status = FAILED). */
  async persistFailure(
    jobId: string,
    job: SorobanTxJob,
    failureReason: string,
    attemptsMade: number,
  ): Promise<FailedSorobanTxEntity> {
    const record = this.repo.create({
      jobId,
      contractMethod: job.contractMethod,
      idempotencyKey: job.idempotencyKey,
      payload: job as unknown as Record<string, unknown>,
      failureReason,
      attemptsMade,
      status: FailedSorobanTxStatus.FAILED,
    });

    const saved = await this.repo.save(record);
    this.logger.warn(
      `[FailedSorobanTx] Persisted failed tx: id=${saved.id} job=${jobId} method=${job.contractMethod}`,
    );
    return saved;
  }

  /** Mark a record as replayed after a successful admin retry. */
  async markReplayed(id: string): Promise<void> {
    await this.repo.update(id, { status: FailedSorobanTxStatus.REPLAYED });
  }

  /** Count rows that are still in FAILED state (unresolved). */
  async countUnresolved(): Promise<number> {
    return this.repo.count({
      where: { status: FailedSorobanTxStatus.FAILED },
    });
  }

  /** Return all unresolved failed transactions for the admin retry endpoint. */
  async findUnresolved(): Promise<FailedSorobanTxEntity[]> {
    return this.repo.find({
      where: { status: FailedSorobanTxStatus.FAILED },
      order: { createdAt: 'ASC' },
    });
  }
}
