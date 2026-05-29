import { Repository, SelectQueryBuilder } from 'typeorm';

import { BloodInventoryQueryService } from './blood-inventory-query.service';
import {
  QueryBloodInventoryDto,
  InventorySortField,
  SortOrder,
} from './dto/query-blood-inventory.dto';
import { BloodUnit } from './entities/blood-unit.entity';
import { BloodComponent } from './enums/blood-component.enum';
import { BloodStatus } from './enums/blood-status.enum';
import { BloodType } from './enums/blood-type.enum';

const BANK_ID = 'GBZXN7PIRZGNMHGAW3DKM6S6Q2LQVCWKBDRTW2TCRG5G3T2MBJX4W7OE';

function makeUnit(overrides: Partial<BloodUnit> = {}): BloodUnit {
  const unit = new BloodUnit();
  unit.id = 'unit-1';
  unit.bloodType = BloodType.A_POSITIVE;
  unit.status = BloodStatus.AVAILABLE;
  unit.component = BloodComponent.WHOLE_BLOOD;
  unit.organizationId = BANK_ID;
  unit.volumeMl = 450;
  unit.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  unit.collectedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Object.assign(unit, overrides);
}

type MockQb = jest.Mocked<
  Pick<
    SelectQueryBuilder<BloodUnit>,
    | 'andWhere'
    | 'where'
    | 'orderBy'
    | 'take'
    | 'skip'
    | 'select'
    | 'getManyAndCount'
    | 'getMany'
  >
>;

describe('BloodInventoryQueryService', () => {
  let service: BloodInventoryQueryService;
  let repo: jest.Mocked<Pick<Repository<BloodUnit>, 'createQueryBuilder'>>;

  function mockQb(units: BloodUnit[], total?: number): MockQb {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([units, total ?? units.length]),
      getMany: jest.fn().mockResolvedValue(units),
    } as unknown as MockQb;
    repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
    return qb;
  }

  beforeEach(() => {
    repo = { createQueryBuilder: jest.fn() } as unknown as jest.Mocked<
      Pick<Repository<BloodUnit>, 'createQueryBuilder'>
    >;
    service = new BloodInventoryQueryService(repo as Repository<BloodUnit>);
  });

  // ── query ──────────────────────────────────────────────────────────────────

  describe('query()', () => {
    it('returns paginated results with defaults', async () => {
      const units = [makeUnit()];
      mockQb(units);

      const result = await service.query({} as QueryBloodInventoryDto);

      expect(result.data).toEqual(units);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('applies blood type filter', async () => {
      const qb = mockQb([]);
      await service.query({
        bloodType: BloodType.O_NEGATIVE,
      } as QueryBloodInventoryDto);
      expect(qb.andWhere).toHaveBeenCalledWith('u.bloodType = :bloodType', {
        bloodType: BloodType.O_NEGATIVE,
      });
    });

    it('applies status filter', async () => {
      const qb = mockQb([]);
      await service.query({
        status: BloodStatus.RESERVED,
      } as QueryBloodInventoryDto);
      expect(qb.andWhere).toHaveBeenCalledWith('u.status = :status', {
        status: BloodStatus.RESERVED,
      });
    });

    it('applies component filter', async () => {
      const qb = mockQb([]);
      await service.query({
        component: BloodComponent.PLATELETS,
      } as QueryBloodInventoryDto);
      expect(qb.andWhere).toHaveBeenCalledWith('u.component = :component', {
        component: BloodComponent.PLATELETS,
      });
    });

    it('applies bankId filter', async () => {
      const qb = mockQb([]);
      await service.query({ bankId: BANK_ID } as QueryBloodInventoryDto);
      expect(qb.andWhere).toHaveBeenCalledWith('u.organizationId = :bankId', {
        bankId: BANK_ID,
      });
    });

    it('applies expiration date range filters', async () => {
      const qb = mockQb([]);
      const after = '2026-01-01T00:00:00.000Z';
      const before = '2026-06-01T00:00:00.000Z';
      await service.query({
        expiresAfter: after,
        expiresBefore: before,
      } as QueryBloodInventoryDto);
      expect(qb.andWhere).toHaveBeenCalledWith('u.expiresAt > :expiresAfter', {
        expiresAfter: new Date(after),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('u.expiresAt < :expiresBefore', {
        expiresBefore: new Date(before),
      });
    });

    it('applies volume range filters', async () => {
      const qb = mockQb([]);
      await service.query({
        minVolumeMl: 200,
        maxVolumeMl: 500,
      } as QueryBloodInventoryDto);
      expect(qb.andWhere).toHaveBeenCalledWith('u.volumeMl >= :minVolumeMl', {
        minVolumeMl: 200,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('u.volumeMl <= :maxVolumeMl', {
        maxVolumeMl: 500,
      });
    });

    it('applies sorting and pagination', async () => {
      const qb = mockQb([]);
      await service.query({
        sortBy: InventorySortField.VOLUME_ML,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 5,
      } as QueryBloodInventoryDto);
      expect(qb.orderBy).toHaveBeenCalledWith('u.volumeMl', SortOrder.DESC);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.skip).toHaveBeenCalledWith(5);
    });

    it('returns empty results when no units match', async () => {
      mockQb([], 0);
      const result = await service.query({
        bloodType: BloodType.AB_NEGATIVE,
      } as QueryBloodInventoryDto);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ── checkAvailability ──────────────────────────────────────────────────────

  describe('checkAvailability()', () => {
    it('returns available=true when sufficient volume exists', async () => {
      const units = [
        makeUnit({ volumeMl: 450 }),
        makeUnit({ id: 'unit-2', volumeMl: 300 }),
      ];
      mockQb(units);

      const result = await service.checkAvailability(BloodType.A_POSITIVE, 600);

      expect(result.isAvailable).toBe(true);
      expect(result.availableVolumeMl).toBe(750);
      expect(result.availableUnits).toBe(2);
    });

    it('returns available=false when insufficient volume', async () => {
      mockQb([makeUnit({ volumeMl: 200 })]);
      const result = await service.checkAvailability(BloodType.A_POSITIVE, 500);
      expect(result.isAvailable).toBe(false);
    });

    it('returns available=false when no units exist', async () => {
      mockQb([]);
      const result = await service.checkAvailability(BloodType.O_NEGATIVE, 450);
      expect(result.isAvailable).toBe(false);
      expect(result.availableVolumeMl).toBe(0);
      expect(result.availableUnits).toBe(0);
    });

    it('filters by AVAILABLE status and non-expired units', async () => {
      const qb = mockQb([]);
      await service.checkAvailability(BloodType.B_POSITIVE, 300);
      expect(qb.andWhere).toHaveBeenCalledWith('u.status = :status', {
        status: BloodStatus.AVAILABLE,
      });
      const calls = (qb.andWhere as jest.Mock).mock.calls as [
        string,
        Record<string, unknown>,
      ][];
      const nowCall = calls.find(([sql]) => sql === 'u.expiresAt > :now');
      expect(nowCall).toBeDefined();
      expect(nowCall?.[1]['now']).toBeInstanceOf(Date);
    });
  });

  // ── getStatistics ──────────────────────────────────────────────────────────

  describe('getStatistics()', () => {
    it('calculates counts by status correctly', async () => {
      const units = [
        makeUnit({ status: BloodStatus.AVAILABLE }),
        makeUnit({ id: 'u2', status: BloodStatus.RESERVED }),
        makeUnit({ id: 'u3', status: BloodStatus.IN_TRANSIT }),
        makeUnit({ id: 'u4', status: BloodStatus.EXPIRED }),
      ];
      mockQb(units);

      const stats = await service.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.available).toBe(1);
      expect(stats.reserved).toBe(1);
      expect(stats.inTransit).toBe(1);
      expect(stats.expired).toBe(1);
    });

    it('counts expiring soon (within 72 hours)', async () => {
      const soonExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const laterExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const units = [
        makeUnit({ expiresAt: soonExpiry }),
        makeUnit({ id: 'u2', expiresAt: laterExpiry }),
      ];
      mockQb(units);

      const stats = await service.getStatistics();
      expect(stats.expiringSoon).toBe(1);
    });

    it('aggregates by blood type and component', async () => {
      const units = [
        makeUnit({
          bloodType: BloodType.A_POSITIVE,
          component: BloodComponent.WHOLE_BLOOD,
        }),
        makeUnit({
          id: 'u2',
          bloodType: BloodType.O_NEGATIVE,
          component: BloodComponent.PLATELETS,
        }),
        makeUnit({
          id: 'u3',
          bloodType: BloodType.A_POSITIVE,
          component: BloodComponent.WHOLE_BLOOD,
        }),
      ];
      mockQb(units);

      const stats = await service.getStatistics();
      expect(stats.byBloodType[BloodType.A_POSITIVE]).toBe(2);
      expect(stats.byBloodType[BloodType.O_NEGATIVE]).toBe(1);
      expect(stats.byComponent[BloodComponent.WHOLE_BLOOD]).toBe(2);
      expect(stats.byComponent[BloodComponent.PLATELETS]).toBe(1);
    });

    it('sums total volume correctly', async () => {
      const units = [
        makeUnit({ volumeMl: 450 }),
        makeUnit({ id: 'u2', volumeMl: 300 }),
      ];
      mockQb(units);

      const stats = await service.getStatistics();
      expect(stats.totalVolumeMl).toBe(750);
    });

    it('scopes query to bankId when provided', async () => {
      const qb = mockQb([]);
      await service.getStatistics(BANK_ID);
      expect(qb.where).toHaveBeenCalledWith('u.organizationId = :bankId', {
        bankId: BANK_ID,
      });
    });

    it('returns zeroed stats for empty inventory', async () => {
      mockQb([]);
      const stats = await service.getStatistics();
      expect(stats.total).toBe(0);
      expect(stats.totalVolumeMl).toBe(0);
      expect(stats.byBloodType).toEqual({});
    });
  });
});
