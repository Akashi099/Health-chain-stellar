import { createHash } from 'crypto';

/**
 * Generate a deterministic idempotency key for blockchain transactions.
 *
 * Format: {operation}-{entityId}-{hash}
 * - operation: Type of operation (e.g., 'donation', 'transfer', 'allocation')
 * - entityId: Unique identifier of the entity (e.g., order ID, donation ID)
 * - hash: SHA256 hash of critical parameters to ensure uniqueness
 *
 * This ensures that:
 * 1. Duplicate API calls with same parameters map to same blockchain submission
 * 2. Different parameters generate different keys even for same entity
 * 3. Keys are deterministic and reproducible
 *
 * @param operation - Operation type (e.g., 'donation', 'transfer')
 * @param entityId - Unique entity identifier
 * @param params - Critical parameters that affect the transaction
 * @returns Deterministic idempotency key
 */
export function generateIdempotencyKey(
  operation: string,
  entityId: string,
  params?: Record<string, any>,
): string {
  if (!operation || !entityId) {
    throw new Error('Operation and entityId are required for idempotency key');
  }

  // If no params, use simple format
  if (!params || Object.keys(params).length === 0) {
    return `${operation}-${entityId}`;
  }

  // Sort params by key for deterministic hashing
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  // Create hash of params
  const paramsJson = JSON.stringify(sortedParams);
  const hash = createHash('sha256').update(paramsJson).digest('hex').slice(0, 16);

  return `${operation}-${entityId}-${hash}`;
}

/**
 * Validate idempotency key format.
 *
 * @param key - Idempotency key to validate
 * @returns True if valid format
 */
export function isValidIdempotencyKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Must have at least operation-entityId format
  const parts = key.split('-');
  return parts.length >= 2 && parts.every((part) => part.length > 0);
}
