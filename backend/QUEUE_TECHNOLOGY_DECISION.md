# Queue Technology Decision - BullMQ Migration

## Decision: Migrate to BullMQ exclusively

### Rationale

1. **BullMQ is the modern successor to Bull**
   - Bull v4 is in maintenance mode
   - BullMQ is actively maintained and developed
   - BullMQ has better TypeScript support and type safety

2. **Current State Analysis**
   - Notifications module uses BullMQ (modern)
   - Blockchain module uses Bull (legacy)
   - Both are configured in app.module.ts
   - Dual maintenance burden and inconsistent patterns

3. **Benefits of Unification**
   - Single queue library reduces dependencies
   - Consistent job processing patterns across codebase
   - Better performance with BullMQ's optimizations
   - Easier maintenance and debugging
   - Cleaner dependency tree

### Migration Plan

1. Replace all Bull imports with BullMQ
2. Update queue configurations to use BullMQ syntax
3. Update processor decorators to use BullMQ patterns
4. Remove @nestjs/bull dependency
5. Standardize on BullMQ for all queue operations

### Modules Affected

- `blockchain.module.ts` - Migrate from Bull to BullMQ
- `app.module.ts` - Remove Bull configuration, keep only BullMQ
- `package.json` - Remove @nestjs/bull dependency

### Backward Compatibility

- No breaking changes to external APIs
- Job processing logic remains the same
- Redis connection configuration unchanged
- Existing jobs in Redis will be handled by BullMQ

### Testing

- Verify all queue processors work with BullMQ
- Test job retry mechanisms
- Validate job deduplication plugin
- Confirm DLQ processing

## Implementation Status

✅ Decision documented
✅ Blockchain module migrated to BullMQ
✅ App module updated
✅ Dependencies cleaned up
