import {
  generateIdempotencyKey,
  isValidIdempotencyKey,
} from './idempotency-key.util';

describe('Idempotency Key Utility', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate simple key without params', () => {
      const key = generateIdempotencyKey('donation', 'donor-123');
      expect(key).toBe('donation-donor-123');
    });

    it('should generate key with hash when params provided', () => {
      const key = generateIdempotencyKey('order', 'order-456', {
        bloodType: 'A+',
        quantity: 5,
      });

      expect(key).toMatch(/^order-order-456-[a-f0-9]{16}$/);
    });

    it('should generate same key for same params (deterministic)', () => {
      const params = { bloodType: 'O-', quantity: 10, hospitalId: 'h1' };

      const key1 = generateIdempotencyKey('transfer', 'tx-789', params);
      const key2 = generateIdempotencyKey('transfer', 'tx-789', params);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = generateIdempotencyKey('order', 'order-1', {
        quantity: 5,
      });
      const key2 = generateIdempotencyKey('order', 'order-1', {
        quantity: 10,
      });

      expect(key1).not.toBe(key2);
    });

    it('should generate same key regardless of param order', () => {
      const key1 = generateIdempotencyKey('order', 'order-1', {
        bloodType: 'A+',
        quantity: 5,
        hospitalId: 'h1',
      });

      const key2 = generateIdempotencyKey('order', 'order-1', {
        hospitalId: 'h1',
        quantity: 5,
        bloodType: 'A+',
      });

      expect(key1).toBe(key2);
    });

    it('should throw error if operation is missing', () => {
      expect(() => generateIdempotencyKey('', 'entity-1')).toThrow(
        'Operation and entityId are required',
      );
    });

    it('should throw error if entityId is missing', () => {
      expect(() => generateIdempotencyKey('operation', '')).toThrow(
        'Operation and entityId are required',
      );
    });

    it('should handle empty params object', () => {
      const key = generateIdempotencyKey('donation', 'donor-123', {});
      expect(key).toBe('donation-donor-123');
    });

    it('should handle complex nested params', () => {
      const key1 = generateIdempotencyKey('order', 'order-1', {
        details: { bloodType: 'A+', quantity: 5 },
        metadata: { source: 'api' },
      });

      const key2 = generateIdempotencyKey('order', 'order-1', {
        details: { bloodType: 'A+', quantity: 5 },
        metadata: { source: 'api' },
      });

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^order-order-1-[a-f0-9]{16}$/);
    });
  });

  describe('isValidIdempotencyKey', () => {
    it('should validate correct simple key', () => {
      expect(isValidIdempotencyKey('donation-donor-123')).toBe(true);
    });

    it('should validate correct key with hash', () => {
      expect(isValidIdempotencyKey('order-order-456-abc123def456')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidIdempotencyKey('')).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidIdempotencyKey(null as any)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidIdempotencyKey(undefined as any)).toBe(false);
    });

    it('should reject single part key', () => {
      expect(isValidIdempotencyKey('donation')).toBe(false);
    });

    it('should reject key with empty parts', () => {
      expect(isValidIdempotencyKey('donation--123')).toBe(false);
    });

    it('should accept key with many parts', () => {
      expect(isValidIdempotencyKey('a-b-c-d-e-f')).toBe(true);
    });
  });

  describe('Idempotency guarantee', () => {
    it('should ensure duplicate API calls map to same blockchain submission', () => {
      // Simulate duplicate API call with same parameters
      const orderData = {
        orderId: 'order-123',
        bloodType: 'A+',
        quantity: 5,
        hospitalId: 'h1',
      };

      const key1 = generateIdempotencyKey('order-create', orderData.orderId, {
        bloodType: orderData.bloodType,
        quantity: orderData.quantity,
        hospitalId: orderData.hospitalId,
      });

      const key2 = generateIdempotencyKey('order-create', orderData.orderId, {
        bloodType: orderData.bloodType,
        quantity: orderData.quantity,
        hospitalId: orderData.hospitalId,
      });

      // Both calls should generate the same idempotency key
      expect(key1).toBe(key2);
    });

    it('should ensure different parameters generate different keys', () => {
      const orderId = 'order-123';

      const key1 = generateIdempotencyKey('order-create', orderId, {
        bloodType: 'A+',
        quantity: 5,
      });

      const key2 = generateIdempotencyKey('order-create', orderId, {
        bloodType: 'A+',
        quantity: 10, // Different quantity
      });

      // Different parameters should generate different keys
      expect(key1).not.toBe(key2);
    });
  });
});
