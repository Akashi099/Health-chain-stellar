/// <reference types="jest" />
import { ConflictException } from '@nestjs/common';

import { OrderEntity } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { DisputePolicyService } from './dispute-policy.service';

const svc = new DisputePolicyService();

const order = (overrides: Partial<OrderEntity> = {}): OrderEntity =>
  ({
    id: 'order-1',
    status: OrderStatus.DELIVERED,
    disputeId: null,
    disputeReason: null,
    ...overrides,
  }) as OrderEntity;

describe('DisputePolicyService', () => {
  describe('assertCanRaiseDispute', () => {
    it('allows dispute on IN_TRANSIT order', () => {
      expect(() =>
        svc.assertCanRaiseDispute(order({ status: OrderStatus.IN_TRANSIT })),
      ).not.toThrow();
    });

    it('allows dispute on DELIVERED order', () => {
      expect(() =>
        svc.assertCanRaiseDispute(order({ status: OrderStatus.DELIVERED })),
      ).not.toThrow();
    });

    it('throws ConflictException when order is already DISPUTED (no duplicate open disputes)', () => {
      expect(() =>
        svc.assertCanRaiseDispute(
          order({
            status: OrderStatus.DISPUTED,
            disputeId: 'existing-dispute',
          }),
        ),
      ).toThrow(ConflictException);
    });

    it('throws ConflictException when order is RESOLVED (post-resolution constraint)', () => {
      expect(() =>
        svc.assertCanRaiseDispute(order({ status: OrderStatus.RESOLVED })),
      ).toThrow(ConflictException);
    });

    it('throws ConflictException for PENDING order', () => {
      expect(() =>
        svc.assertCanRaiseDispute(order({ status: OrderStatus.PENDING })),
      ).toThrow(ConflictException);
    });

    it('throws ConflictException for CANCELLED order', () => {
      expect(() =>
        svc.assertCanRaiseDispute(order({ status: OrderStatus.CANCELLED })),
      ).toThrow(ConflictException);
    });

    it('allows re-dispute on DELIVERED order that was previously disputed (post-resolution re-delivery)', () => {
      // After RESOLVED → DELIVERED, disputeId is set but status is DELIVERED — allowed
      expect(() =>
        svc.assertCanRaiseDispute(
          order({ status: OrderStatus.DELIVERED, disputeId: 'old-dispute' }),
        ),
      ).not.toThrow();
    });

    it('blocks re-dispute when previously disputed order is not yet re-delivered', () => {
      // disputeId set but status is CONFIRMED — not a disputable status
      expect(() =>
        svc.assertCanRaiseDispute(
          order({ status: OrderStatus.CONFIRMED, disputeId: 'old-dispute' }),
        ),
      ).toThrow(ConflictException);
    });
  });

  describe('assertCanResolveDispute', () => {
    it('allows resolution when order is DISPUTED', () => {
      expect(() =>
        svc.assertCanResolveDispute(order({ status: OrderStatus.DISPUTED })),
      ).not.toThrow();
    });

    it('throws ConflictException when order is not DISPUTED', () => {
      expect(() =>
        svc.assertCanResolveDispute(order({ status: OrderStatus.DELIVERED })),
      ).toThrow(ConflictException);
    });

    it('throws ConflictException when order is already RESOLVED', () => {
      expect(() =>
        svc.assertCanResolveDispute(order({ status: OrderStatus.RESOLVED })),
      ).toThrow(ConflictException);
    });
  });

  describe('Acceptance: contract behavior matches documented dispute policy', () => {
    it('no duplicate open disputes — second raise on DISPUTED throws', () => {
      const disputed = order({
        status: OrderStatus.DISPUTED,
        disputeId: 'd-1',
      });
      expect(() => svc.assertCanRaiseDispute(disputed)).toThrow(
        ConflictException,
      );
    });

    it('post-resolution constraint — RESOLVED order cannot be re-disputed directly', () => {
      const resolved = order({
        status: OrderStatus.RESOLVED,
        disputeId: 'd-1',
      });
      expect(() => svc.assertCanRaiseDispute(resolved)).toThrow(
        ConflictException,
      );
    });

    it('post-resolution re-dispute allowed after re-delivery', () => {
      const redelivered = order({
        status: OrderStatus.DELIVERED,
        disputeId: 'd-1',
      });
      expect(() => svc.assertCanRaiseDispute(redelivered)).not.toThrow();
    });

    it('only IN_TRANSIT and DELIVERED are disputable statuses', () => {
      const nonDisputable = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.DISPATCHED,
        OrderStatus.CANCELLED,
      ];
      nonDisputable.forEach((status) => {
        expect(() => svc.assertCanRaiseDispute(order({ status }))).toThrow(
          ConflictException,
        );
      });

      [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].forEach((status) => {
        expect(() =>
          svc.assertCanRaiseDispute(order({ status })),
        ).not.toThrow();
      });
    });
  });
});
