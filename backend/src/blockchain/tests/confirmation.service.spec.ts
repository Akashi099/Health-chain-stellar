/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';

import { ConfirmationService } from '../services/confirmation.service';

const makeRedis = (store: Map<string, number> = new Map()) => ({
  incrBy: jest.fn(async (key: string, by: number) => {
    const next = (store.get(key) ?? 0) + by;
    store.set(key, next);
    return next;
  }),
  expire: jest.fn().mockResolvedValue(1),
  get: jest.fn(async (key: string) => {
    const v = store.get(key);
    return v !== undefined ? String(v) : null;
  }),
});

async function buildService(
  depth: string,
  redis = makeRedis(),
): Promise<ConfirmationService> {
  process.env.SOROBAN_CONFIRMATION_DEPTH = depth;
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ConfirmationService,
      { provide: 'REDIS_CLIENT', useValue: redis },
    ],
  }).compile();
  return module.get(ConfirmationService);
}

describe('ConfirmationService', () => {
  afterEach(() => {
    delete process.env.SOROBAN_CONFIRMATION_DEPTH;
  });

  describe('finalityThreshold', () => {
    it('defaults to 1 when env var is absent', async () => {
      delete process.env.SOROBAN_CONFIRMATION_DEPTH;
      const svc = await buildService('1');
      expect(svc.finalityThreshold).toBe(1);
    });

    it('reads SOROBAN_CONFIRMATION_DEPTH from env', async () => {
      const svc = await buildService('3');
      expect(svc.finalityThreshold).toBe(3);
    });

    it('clamps to 1 for invalid values', async () => {
      const svc = await buildService('0');
      expect(svc.finalityThreshold).toBe(1);
    });
  });

  describe('recordConfirmations', () => {
    it('returns "confirmed" when below threshold', async () => {
      const svc = await buildService('3');
      const state = await svc.recordConfirmations('tx-abc', 1);
      expect(state.status).toBe('confirmed');
      expect(state.confirmations).toBe(1);
      expect(state.finalityThreshold).toBe(3);
    });

    it('returns "final" when threshold is exactly met', async () => {
      const svc = await buildService('2');
      await svc.recordConfirmations('tx-abc', 1); // total = 1
      const state = await svc.recordConfirmations('tx-abc', 1); // total = 2
      expect(state.status).toBe('final');
      expect(state.confirmations).toBe(2);
    });

    it('returns "final" when threshold is exceeded', async () => {
      const svc = await buildService('2');
      const state = await svc.recordConfirmations('tx-abc', 5);
      expect(state.status).toBe('final');
      expect(state.confirmations).toBe(5);
    });

    it('returns "final" immediately when depth=1 (default)', async () => {
      const svc = await buildService('1');
      const state = await svc.recordConfirmations('tx-abc', 1);
      expect(state.status).toBe('final');
    });

    it('accumulates confirmations across multiple callbacks', async () => {
      const store = new Map<string, number>();
      const redis = makeRedis(store);
      const svc = await buildService('3', redis);

      const s1 = await svc.recordConfirmations('tx-multi', 1);
      expect(s1.status).toBe('confirmed');

      const s2 = await svc.recordConfirmations('tx-multi', 1);
      expect(s2.status).toBe('confirmed');

      const s3 = await svc.recordConfirmations('tx-multi', 1);
      expect(s3.status).toBe('final');
    });

    it('refreshes TTL on every call', async () => {
      const redis = makeRedis();
      const svc = await buildService('1', redis);
      await svc.recordConfirmations('tx-ttl', 1);
      expect(redis.expire).toHaveBeenCalledWith(
        'tx-confirmations:tx-ttl',
        86400,
      );
    });
  });

  describe('getConfirmations', () => {
    it('returns 0 for unknown transaction', async () => {
      const svc = await buildService('1');
      expect(await svc.getConfirmations('tx-unknown')).toBe(0);
    });

    it('returns stored count after recording', async () => {
      const store = new Map<string, number>();
      const redis = makeRedis(store);
      const svc = await buildService('3', redis);
      await svc.recordConfirmations('tx-read', 2);
      expect(await svc.getConfirmations('tx-read')).toBe(2);
    });
  });

  describe('status transition acceptance', () => {
    it('honors finality threshold: tx stays confirmed until depth reached', async () => {
      const depth = 5;
      const store = new Map<string, number>();
      const redis = makeRedis(store);
      const svc = await buildService(String(depth), redis);

      for (let i = 1; i < depth; i++) {
        const state = await svc.recordConfirmations('tx-honor', 1);
        expect(state.status).toBe('confirmed');
      }

      const finalState = await svc.recordConfirmations('tx-honor', 1);
      expect(finalState.status).toBe('final');
      expect(finalState.confirmations).toBe(depth);
    });
  });
});
