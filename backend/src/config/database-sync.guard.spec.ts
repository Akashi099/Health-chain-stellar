import { DatabaseSyncGuard } from './database-sync.guard';

describe('DatabaseSyncGuard', () => {
  it('should allow synchronize in development', () => {
    expect(() => {
      DatabaseSyncGuard.validateSynchronizeConfig('development', true);
    }).not.toThrow();
  });

  it('should allow synchronize in test', () => {
    expect(() => {
      DatabaseSyncGuard.validateSynchronizeConfig('test', true);
    }).not.toThrow();
  });

  it('should throw error when synchronize is enabled in staging', () => {
    expect(() => {
      DatabaseSyncGuard.validateSynchronizeConfig('staging', true);
    }).toThrow(
      'TypeORM synchronize must be disabled in staging environment. Use migrations instead.',
    );
  });

  it('should throw error when synchronize is enabled in production', () => {
    expect(() => {
      DatabaseSyncGuard.validateSynchronizeConfig('production', true);
    }).toThrow(
      'TypeORM synchronize must be disabled in production environment. Use migrations instead.',
    );
  });

  it('should allow synchronize disabled in any environment', () => {
    expect(() => {
      DatabaseSyncGuard.validateSynchronizeConfig('production', false);
    }).not.toThrow();

    expect(() => {
      DatabaseSyncGuard.validateSynchronizeConfig('staging', false);
    }).not.toThrow();
  });
});
