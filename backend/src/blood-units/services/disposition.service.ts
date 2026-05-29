import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitDispositionRecord } from '../entities/unit-disposition.entity';
import { BloodUnit } from '../entities/blood-unit.entity';
import {
  UnitDisposition,
  DispositionReason,
} from '../enums/unit-disposition.enum';

@Injectable()
export class DispositionService {
  constructor(
    @InjectRepository(UnitDispositionRecord)
    private dispositionRepo: Repository<UnitDispositionRecord>,
    @InjectRepository(BloodUnit)
    private bloodUnitRepo: Repository<BloodUnit>,
  ) {}

  async evaluateFailedDelivery(
    bloodUnitId: string,
    elapsedTimeMinutes: number,
    temperatureBreach: boolean,
    coldChainVerified: boolean,
  ): Promise<{
    recommendedDisposition: UnitDisposition;
    reason: DispositionReason;
    canReturnToStock: boolean;
  }> {
    const unit = await this.bloodUnitRepo.findOne({
      where: { id: bloodUnitId },
    });

    if (!unit) {
      throw new BadRequestException('Blood unit not found');
    }

    // Safety rules for return to stock
    const maxSafeTimeMinutes = 240; // 4 hours
    const canReturnToStock =
      !temperatureBreach &&
      coldChainVerified &&
      elapsedTimeMinutes <= maxSafeTimeMinutes;

    let recommendedDisposition: UnitDisposition;
    let reason: DispositionReason;

    if (temperatureBreach) {
      recommendedDisposition = UnitDisposition.DISCARDED;
      reason = DispositionReason.COLD_CHAIN_BREACH;
    } else if (elapsedTimeMinutes > maxSafeTimeMinutes) {
      recommendedDisposition = UnitDisposition.QUARANTINED;
      reason = DispositionReason.TIME_EXCEEDED;
    } else if (!coldChainVerified) {
      recommendedDisposition = UnitDisposition.QUARANTINED;
      reason = DispositionReason.QUALITY_CONCERN;
    } else {
      recommendedDisposition = UnitDisposition.RETURNED;
      reason = DispositionReason.DELIVERY_FAILED;
    }

    return {
      recommendedDisposition,
      reason,
      canReturnToStock,
    };
  }

  async recordDisposition(
    bloodUnitId: string,
    disposition: UnitDisposition,
    reason: DispositionReason,
    decidedBy: string,
    notes?: string,
    elapsedTimeMinutes?: number,
    temperatureBreach?: boolean,
    coldChainVerified?: boolean,
  ): Promise<UnitDispositionRecord> {
    // Validate safety rules
    if (disposition === UnitDisposition.RETURNED) {
      if (temperatureBreach) {
        throw new BadRequestException(
          'Cannot return unit to stock with temperature breach',
        );
      }
      if (elapsedTimeMinutes && elapsedTimeMinutes > 240) {
        throw new BadRequestException(
          'Cannot return unit to stock after 4 hours elapsed',
        );
      }
    }

    const record = this.dispositionRepo.create({
      bloodUnitId,
      disposition,
      reason,
      decidedBy,
      notes,
      elapsedTimeMinutes,
      temperatureBreach: temperatureBreach || false,
      coldChainVerified: coldChainVerified || false,
    });

    const saved = await this.dispositionRepo.save(record);

    // Update blood unit status
    await this.bloodUnitRepo.update(bloodUnitId, {
      status: disposition as any,
    });

    return saved;
  }

  async getDispositionHistory(
    bloodUnitId: string,
  ): Promise<UnitDispositionRecord[]> {
    return this.dispositionRepo.find({
      where: { bloodUnitId },
      order: { decidedAt: 'DESC' },
    });
  }
}
