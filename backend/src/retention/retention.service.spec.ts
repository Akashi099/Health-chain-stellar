import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { REDIS_CLIENT } from '../redis/redis.constants';
import { UserActivityEntity } from '../user-activity/entities/user-activity.entity';

import { RetentionService } from './retention.service';

describe('RetentionService', () => {
  let service: RetentionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                RETENTION_SESSION_TTL_DAYS: 30,
                RETENTION_ACTIVITY_LOG_DAYS: 90,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            scanStream: jest.fn(),
            hgetall: jest.fn(),
            del: jest.fn(),
            zrem: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserActivityEntity),
          useValue: {
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupStaleData', () => {
    it('should cleanup both sessions and activity logs', async () => {
      jest.spyOn(service as never, 'cleanupStaleSessions').mockResolvedValue(5);
      jest
        .spyOn(service as never, 'cleanupOldActivityLogs')
        .mockResolvedValue(10);

      await service.cleanupStaleData();

      expect(service['cleanupStaleSessions']).toHaveBeenCalled();
      expect(service['cleanupOldActivityLogs']).toHaveBeenCalled();
    });
  });

  describe('triggerRetention', () => {
    it('should return counts of deleted items', async () => {
      jest.spyOn(service as never, 'cleanupStaleSessions').mockResolvedValue(5);
      jest
        .spyOn(service as never, 'cleanupOldActivityLogs')
        .mockResolvedValue(10);

      const result = await service.triggerRetention();

      expect(result).toEqual({
        sessionsDeleted: 5,
        logsDeleted: 10,
      });
    });
  });
});
