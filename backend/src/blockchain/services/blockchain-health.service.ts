import { Injectable } from '@nestjs/common';

import { FailedSorobanTxService } from './failed-soroban-tx.service';

export interface BlockchainHealthStatus {
  status: 'ok' | 'degraded';
  unresolvedFailedTransactions: number;
  message: string;
}

/**
 * Reports the health of the blockchain integration by counting
 * unresolved failed Soroban transactions in the outbox table.
 *
 * status = 'ok'       → zero unresolved failures
 * status = 'degraded' → one or more failures require admin attention
 */
@Injectable()
export class BlockchainHealthService {
  constructor(private readonly failedTxService: FailedSorobanTxService) {}

  async check(): Promise<BlockchainHealthStatus> {
    const count = await this.failedTxService.countUnresolved();

    if (count === 0) {
      return {
        status: 'ok',
        unresolvedFailedTransactions: 0,
        message: 'All Soroban transactions resolved.',
      };
    }

    return {
      status: 'degraded',
      unresolvedFailedTransactions: count,
      message: `${count} Soroban transaction(s) permanently failed and require admin replay.`,
    };
  }
}
