import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ReputationAwareAssignmentService } from '../services/reputation-aware-assignment.service';
import { RiderEntity } from '../entities/rider.entity';
import { AssignmentWeightsEntity } from '../entities/assignment-weights.entity';
import { AssignmentDecisionEntity } from '../entities/assignment-decision.entity';
import { ReputationEntity } from '../../reputation/entities/reputation.entity';
import { RiderStatus } from '../enums/rider-status.enum';
import { VehicleType } from '../enums/vehicle-type.enum';

const makeRider = (id: string, lat: number, lon: number, completed = 10, cancelled = 0, failed = 0, rating = 4.5): RiderEntity =>
  ({ id, latitude: lat, longitude: lon, status: RiderStatus.AVAILABLE, isVerified: true, completedDeliveries: completed, cancelledDeliveries: cancelled, failedDeliveries: failed, rating, vehicleType: VehicleType.MOTORCYCLE } as any);

const defaultWeights: AssignmentWeightsEntity = {
  id: 'w1', name: 'default', isActive: true,
  distanceWeight: 0.3, reputationWeight: 0.25, rejectionRateWeight: 0.2,
  completionRateWeight: 0.15, coldChainWeight: 0.1,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('ReputationAwareAssignmentService', () => {
  let service: ReputationAwareAssignmentService;
  const riderRepo = { find: jest.fn() };
  const repRepo = { find: jest.fn() };
  const weightsRepo = { findOne: jest.fn(), create: jest.fn((v) => v), save: jest.fn((v) => Promise.resolve(v)) };
  const decisionRepo = { save: jest.fn((v) => Promise.resolve(v)), create: jest.fn((v) => v), findOne: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReputationAwareAssignmentService,
        { provide: getRepositoryToken(RiderEntity), useValue: riderRepo },
        { provide: getRepositoryToken(ReputationEntity), useValue: repRepo },
        { provide: getRepositoryToken(AssignmentWeightsEntity), useValue: weightsRepo },
        { provide: getRepositoryToken(AssignmentDecisionEntity), useValue: decisionRepo },
      ],
    }).compile();
    service = module.get(ReputationAwareAssignmentService);
    weightsRepo.findOne.mockResolvedValue(defaultWeights);
    repRepo.find.mockResolvedValue([]);
  });

  it('selects the closest rider when all else is equal', async () => {
    riderRepo.find.mockResolvedValue([
      makeRider('far', 6.5, 3.4),   // ~55 km away
      makeRider('near', 6.45, 3.38), // ~1 km away
    ]);
    const result = await service.assignRider({ orderId: 'ord-1', pickupLat: 6.45, pickupLon: 3.38 });
    expect(result.selectedRiderId).toBe('near');
  });

  it('deprioritizes high-rejection rider even if closer', async () => {
    riderRepo.find.mockResolvedValue([
      makeRider('close-bad', 6.45, 3.38, 5, 8, 0),  // 62% rejection rate, 0.5 km
      makeRider('far-good', 6.46, 3.39, 50, 0, 0),  // 0% rejection, 1.5 km
    ]);
    repRepo.find.mockResolvedValue([
      { riderId: 'far-good', reputationScore: 400 },
    ]);
    const result = await service.assignRider({ orderId: 'ord-2', pickupLat: 6.45, pickupLon: 3.38 });
    expect(result.selectedRiderId).toBe('far-good');
  });

  it('persists the assignment decision', async () => {
    riderRepo.find.mockResolvedValue([makeRider('r1', 6.45, 3.38)]);
    await service.assignRider({ orderId: 'ord-3', pickupLat: 6.45, pickupLon: 3.38 });
    expect(decisionRepo.save).toHaveBeenCalled();
  });

  it('throws when no riders are available', async () => {
    riderRepo.find.mockResolvedValue([]);
    await expect(service.assignRider({ orderId: 'ord-4', pickupLat: 6.45, pickupLon: 3.38 })).rejects.toThrow();
  });
});
