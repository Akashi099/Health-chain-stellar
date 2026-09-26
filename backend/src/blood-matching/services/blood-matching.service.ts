import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { DataSource, MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';

import { BloodRequestItemEntity } from '../../blood-requests/entities/blood-request-item.entity';
import { BloodRequestEntity } from '../../blood-requests/entities/blood-request.entity';
import { BloodUnit } from '../../blood-units/entities/blood-unit.entity';
import { BloodStatus } from '../../blood-units/enums/blood-status.enum';
import { BloodComponent } from '../../blood-units/enums/blood-component.enum';
import { InventoryStockEntity } from '../../inventory/entities/inventory-stock.entity';
import { BloodCompatibilityEngine } from '../compatibility/blood-compatibility.engine';
import type { BloodTypeStr } from '../compatibility/compatibility.types';

export interface BloodTypeCompatibility {
  [key: string]: {
    canDonateTo: string[];
    canReceiveFrom: string[];
  };
}

export interface MatchResult {
  bloodUnitId: string;
  bloodType: string;
  bankId: string;
  quantityMl: number;
  expirationDate: Date;
  matchScore: number;
  matchType: 'exact' | 'compatible' | 'emergency' | 'partial';
  /** Human-readable explanation of why this unit is compatible */
  explanation: string;
  distance?: number;
}

export interface MatchingRequest {
  requestId: string;
  hospitalId: string;
  bloodType: string;
  quantityMl: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requiredBy: Date;
  latitude?: number;
  longitude?: number;
}

export interface MatchingResponse {
  requestId: string;
  matches: MatchResult[];
  totalMatched: number;
  partialFulfillment: boolean;
  remainingQuantity: number;
}

/**
 * Default reservation window (in minutes) applied to units reserved by the
 * matching flow. Units are released automatically once `reservedUntil`
 * elapses so a match can never lock inventory indefinitely.
 */
export const DEFAULT_RESERVATION_TTL_MINUTES = 30;

@Injectable()
export class BloodMatchingService {
  private readonly logger = new Logger(BloodMatchingService.name);

  // ABO/Rh compatibility matrix
  private readonly compatibilityMatrix: BloodTypeCompatibility = {
    'O-': {
      canDonateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-'],
    },
    'O+': {
      canDonateTo: ['O+', 'A+', 'B+', 'AB+'],
      canReceiveFrom: ['O-', 'O+'],
    },
    'A-': {
      canDonateTo: ['A-', 'A+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-', 'A-'],
    },
    'A+': {
      canDonateTo: ['A+', 'AB+'],
      canReceiveFrom: ['O-', 'O+', 'A-', 'A+'],
    },
    'B-': {
      canDonateTo: ['B-', 'B+', 'AB-', 'AB+'],
      canReceiveFrom: ['O-', 'B-'],
    },
    'B+': {
      canDonateTo: ['B+', 'AB+'],
      canReceiveFrom: ['O-', 'O+', 'B-', 'B+'],
    },
    'AB-': {
      canDonateTo: ['AB-', 'AB+'],
      canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'],
    },
    'AB+': {
      canDonateTo: ['AB+'],
      canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    },
  };

  // Urgency weights for scoring
  private readonly urgencyWeights = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  constructor(
    @InjectRepository(BloodUnit)
    private readonly bloodUnitRepository: Repository<BloodUnit>,
    @InjectRepository(BloodRequestEntity)
    private readonly bloodRequestRepository: Repository<BloodRequestEntity>,
    @InjectRepository(BloodRequestItemEntity)
    private readonly bloodRequestItemRepository: Repository<BloodRequestItemEntity>,
    @InjectRepository(InventoryStockEntity)
    private readonly inventoryRepository: Repository<InventoryStockEntity>,
    private readonly compatibilityEngine: BloodCompatibilityEngine,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findMatches(request: MatchingRequest): Promise<MatchingResponse> {
    this.logger.log(
      `Finding matches for request ${request.requestId}: ${request.quantityMl}ml of ${request.bloodType}`,
    );

    // Tie the request to a real blood request in the caller's tenant before
    // reserving anything, so a viewer-level account cannot reserve units for
    // an arbitrary / non-existent request.
    await this.assertRequestBelongsToTenant(
      request.requestId,
      request.hospitalId,
    );

    // Get compatible blood types
    const compatibleTypes = this.getCompatibleBloodTypes(request.bloodType);

    // Find, score and reserve matching units atomically so two concurrent
    // requests can never both be handed the same physical unit.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let selectedMatches: MatchResult[];
    try {
      selectedMatches = await this.findAndReserveMatchingUnits(
        queryRunner,
        compatibleTypes,
        request,
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Calculate totals
    const totalMatched = selectedMatches.reduce(
      (sum, match) => sum + match.quantityMl,
      0,
    );
    const remainingQuantity = Math.max(0, request.quantityMl - totalMatched);
    const partialFulfillment = totalMatched > 0 && remainingQuantity > 0;

    return {
      requestId: request.requestId,
      matches: selectedMatches,
      totalMatched,
      partialFulfillment,
      remainingQuantity,
    };
  }

  async findMatchesForMultipleRequests(
    requests: MatchingRequest[],
  ): Promise<MatchingResponse[]> {
    this.logger.log(`Finding matches for ${requests.length} requests`);

    const responses: MatchingResponse[] = [];

    // Sort requests by urgency (critical first)
    const sortedRequests = [...requests].sort((a, b) => {
      const urgencyDiff =
        this.urgencyWeights[b.urgency] - this.urgencyWeights[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;

      // If same urgency, sort by requiredBy date
      return a.requiredBy.getTime() - b.requiredBy.getTime();
    });

    // Process each request. findMatches() already reserves matched units
    // atomically, so units taken by an earlier (higher-urgency) request in
    // this batch are unavailable to later ones.
    for (const request of sortedRequests) {
      const response = await this.findMatches(request);
      responses.push(response);
    }

    return responses;
  }

  getCompatibleBloodTypes(bloodType: string): string[] {
    const compatibility = this.compatibilityMatrix[bloodType];
    if (!compatibility) {
      throw new Error(`Invalid blood type: ${bloodType}`);
    }
    return compatibility.canReceiveFrom;
  }

  getDonatableBloodTypes(bloodType: string): string[] {
    const compatibility = this.compatibilityMatrix[bloodType];
    if (!compatibility) {
      throw new Error(`Invalid blood type: ${bloodType}`);
    }
    return compatibility.canDonateTo;
  }

  /**
   * Ensures the supplied requestId refers to a real blood request that belongs
   * to the caller's tenant (hospitalId). Rejects unknown or cross-tenant
   * requests so a caller cannot reserve inventory against someone else's
   * request.
   */
  private async assertRequestBelongsToTenant(
    requestId: string,
    hospitalId: string,
  ): Promise<void> {
    const bloodRequest = await this.bloodRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!bloodRequest) {
      throw new ConflictException(
        `Blood request ${requestId} does not exist`,
      );
    }

    const requestHospitalId =
      (bloodRequest as any).hospitalId ??
      (bloodRequest as any).hospital?.id ??
      (bloodRequest as any).tenantId;

    if (requestHospitalId && requestHospitalId !== hospitalId) {
      throw new ConflictException(
        `Blood request ${requestId} does not belong to hospital ${hospitalId}`,
      );
    }
  }

  /**
   * Finds candidate units under a pessimistic write lock, scores them, picks
   * the best matches, and reserves them — all inside the caller's
   * transaction — so concurrent callers can never both walk away thinking
   * they secured the same unit.
   */
  private async findAndReserveMatchingUnits(
    queryRunner: QueryRunner,
    bloodTypes: string[],
    request: MatchingRequest,
  ): Promise<MatchResult[]> {
    const now = new Date();

    const candidateUnits = await queryRunner.manager.find(BloodUnit, {
      where: {
        bloodType: bloodTypes as any,
        status: BloodStatus.AVAILABLE,
        expiresAt: MoreThanOrEqual(now),
      },
      order: {
        expiresAt: 'ASC', // FIFO - oldest expiration first
      },
      lock: { mode: 'pessimistic_write' },
    });

    const scoredMatches = await this.scoreMatches(candidateUnits, request);
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
    const selectedMatches = this.selectBestMatches(
      scoredMatches,
      request.quantityMl,
    );

    const reservedUntil = new Date(
      now.getTime() + DEFAULT_RESERVATION_TTL_MINUTES * 60 * 1000,
    );

    for (const match of selectedMatches) {
      const result = await queryRunner.manager.update(
        BloodUnit,
        { id: match.bloodUnitId, status: BloodStatus.AVAILABLE },
        {
          status: BloodStatus.RESERVED,
          reservedFor: request.requestId,
          reservedUntil,
        } as any,
      );
      if (!result.affected) {
        throw new ConflictException(
          `Blood unit ${match.bloodUnitId} is no longer available`,
        );
      }

      // Record the status transition so the reservation is auditable and can
      // be reconciled / released by the expiry sweeper.
      await queryRunner.manager.insert(BloodStatusHistory as any, {
        bloodUnitId: match.bloodUnitId,
        previousStatus: BloodStatus.AVAILABLE,
        newStatus: BloodStatus.RESERVED,
        reason: `Reserved for blood request ${request.requestId}`,
        changedBy: request.hospitalId,
        changedAt: now,
      } as any);

      // Best-effort on-chain sync so the ledger reflects the reservation.
      await this.syncReservationOnChain(queryRunner, match.bloodUnitId);
    }

    return selectedMatches;
  }

  /**
   * Best-effort on-chain sync for a reserved unit. Failures are logged but do
   * not abort the reservation, matching the existing non-blocking sync
   * behaviour elsewhere in the service.
   */
  private async syncReservationOnChain(
    queryRunner: QueryRunner,
    bloodUnitId: string,
  ): Promise<void> {
    try {
      const unit = await queryRunner.manager.findOne(BloodUnit, {
        where: { id: bloodUnitId },
      });
      if (!unit) return;

      const syncFn = (this as any).syncUnitOnChain;
      if (typeof syncFn === 'function') {
        await syncFn.call(this, unit);
      }
    } catch (error) {
      this.logger.warn(
        `On-chain sync failed for reserved unit ${bloodUnitId}: ${
          (error as Error).message
        }`,
      );
    }
  }

  private asyn

/* … truncated 4901 chars — edit only what you need near the top … */
