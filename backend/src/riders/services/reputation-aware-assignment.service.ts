import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PolicyCenterService } from '../../policy-center/policy-center.service';
import { ReputationEntity } from '../../reputation/entities/reputation.entity';
import { RiderEntity } from '../entities/rider.entity';
import { AssignmentWeightsEntity } from '../entities/assignment-weights.entity';
import { AssignmentDecisionEntity } from '../entities/assignment-decision.entity';
import { RiderStatus } from '../enums/rider-status.enum';

interface ScoredCandidate {
  riderId: string;
  totalScore: number;
  breakdown: Record<string, number>;
  distanceKm: number;
}

@Injectable()
export class ReputationAwareAssignmentService {
  constructor(
    @InjectRepository(RiderEntity)
    private readonly riderRepo: Repository<RiderEntity>,
    @InjectRepository(ReputationEntity)
    private readonly reputationRepo: Repository<ReputationEntity>,
    @InjectRepository(AssignmentWeightsEntity)
    private readonly weightsRepo: Repository<AssignmentWeightsEntity>,
    @InjectRepository(AssignmentDecisionEntity)
    private readonly decisionRepo: Repository<AssignmentDecisionEntity>,
    private readonly policyCenterService: PolicyCenterService,
  ) {}

  async assignRider(params: {
    orderId: string;
    pickupLat: number;
    pickupLon: number;
    maxCandidates?: number;
  }): Promise<{ selectedRiderId: string; explanation: ScoredCandidate[] }> {
    const policy = await this.policyCenterService.getActivePolicySnapshot();
    const weights = await this.getActiveWeights();
    const riders = await this.riderRepo.find({
      where: { status: RiderStatus.AVAILABLE, isVerified: true },
    });

    const reputations = await this.reputationRepo.find();
    const repMap = new Map(reputations.map((r) => [r.riderId, r.reputationScore]));

    const scored: ScoredCandidate[] = riders
      .map((rider) => {
        const distanceKm = this.haversine(params.pickupLat, params.pickupLon, rider.latitude, rider.longitude);
        if (distanceKm === null) return null;

        const total = rider.completedDeliveries + rider.cancelledDeliveries + rider.failedDeliveries;
        const completionRate = total === 0 ? 1 : rider.completedDeliveries / total;
        const rejectionRate = total === 0 ? 0 : rider.cancelledDeliveries / total;
        const reputationScore = repMap.get(rider.id) ?? 0;

        const distanceScore = Math.exp(-distanceKm / 5);
        const reputationNorm = Math.min(reputationScore / 500, 1);
        const completionScore = completionRate;
        const rejectionScore = 1 - rejectionRate;
        const coldChainScore = 1; // placeholder — can be wired to compliance stats

        const totalScore =
          distanceScore * weights.distanceWeight +
          reputationNorm * weights.reputationWeight +
          rejectionScore * weights.rejectionRateWeight +
          completionScore * weights.completionRateWeight +
          coldChainScore * weights.coldChainWeight;

        return {
          riderId: rider.id,
          totalScore,
          distanceKm,
          breakdown: {
            distanceScore,
            reputationNorm,
            completionScore,
            rejectionScore,
            coldChainScore,
          },
        } as ScoredCandidate;
      })
      .filter((c): c is ScoredCandidate => c !== null)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, params.maxCandidates ?? 5);

    const selected = scored[0];
    if (!selected) throw new Error('No available riders found');

    await this.decisionRepo.save(
      this.decisionRepo.create({
        orderId: params.orderId,
        selectedRiderId: selected.riderId,
        weightsSnapshot: {
          distanceWeight: weights.distanceWeight,
          reputationWeight: weights.reputationWeight,
          rejectionRateWeight: weights.rejectionRateWeight,
          completionRateWeight: weights.completionRateWeight,
          coldChainWeight: weights.coldChainWeight,
        },
        candidates: scored.map((c) => ({ riderId: c.riderId, totalScore: c.totalScore, breakdown: c.breakdown })),
        policyVersionRef: policy.policyVersionId,
      }),
    );

    return { selectedRiderId: selected.riderId, explanation: scored };
  }

  async getDecision(orderId: string): Promise<AssignmentDecisionEntity | null> {
    return this.decisionRepo.findOne({ where: { orderId } });
  }

  async getActiveWeights(): Promise<AssignmentWeightsEntity> {
    let w = await this.weightsRepo.findOne({ where: { name: 'default', isActive: true } });
    if (!w) {
      const policy = await this.policyCenterService.getActivePolicySnapshot();
      w = this.weightsRepo.create({
        name: 'default',
        distanceWeight: policy.rules.dispatch.distanceWeight,
        reputationWeight: 0.25,
        rejectionRateWeight: 0.2,
        completionRateWeight: 0.15,
        coldChainWeight: 0.1,
        isActive: true,
      });
      w = await this.weightsRepo.save(w);
    }
    return w;
  }

  async updateWeights(updates: Partial<AssignmentWeightsEntity>): Promise<AssignmentWeightsEntity> {
    const w = await this.getActiveWeights();
    Object.assign(w, updates);
    return this.weightsRepo.save(w);
  }

  private haversine(lat1: number | null, lon1: number | null, lat2: number | null, lon2: number | null): number | null {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
