import { ConfigService } from '@nestjs/config';

import { JwtKeyService } from './jwt-key.service';

const makeService = (env: Record<string, string | undefined>) => {
  const configService = {
    get: jest.fn((key: string, defaultValue?: string) => env[key] ?? defaultValue),
  } as unknown as ConfigService;
  return new JwtKeyService(configService);
};

describe('JwtKeyService', () => {
  it('returns active key', () => {
    const svc = makeService({ JWT_SECRET: 'active-secret', JWT_SECRET_KID: 'key-2' });
    expect(svc.getActiveKey()).toEqual({ kid: 'key-2', secret: 'active-secret' });
  });

  it('resolves active key by kid', () => {
    const svc = makeService({ JWT_SECRET: 'active-secret', JWT_SECRET_KID: 'key-2' });
    expect(svc.resolveSecret('key-2')).toBe('active-secret');
  });

  it('resolves previous key by kid during grace period', () => {
    const svc = makeService({
      JWT_SECRET: 'new-secret',
      JWT_SECRET_KID: 'key-2',
      JWT_PREVIOUS_SECRET: 'old-secret',
      JWT_PREVIOUS_SECRET_KID: 'key-1',
    });
    expect(svc.resolveSecret('key-1')).toBe('old-secret');
  });

  it('returns null for unknown kid', () => {
    const svc = makeService({ JWT_SECRET: 'active-secret', JWT_SECRET_KID: 'key-2' });
    expect(svc.resolveSecret('unknown-kid')).toBeNull();
  });

  it('has no previous key when JWT_PREVIOUS_SECRET is not set', () => {
    const svc = makeService({ JWT_SECRET: 'active-secret', JWT_SECRET_KID: 'key-2' });
    expect(svc.resolveSecret('key-1')).toBeNull();
  });
});
