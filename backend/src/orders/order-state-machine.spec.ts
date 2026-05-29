import { OrderStatus } from './enums/order-status.enum';
import { OrderTransitionException } from './exceptions/order-transition.exception';
import {
  OrderStateMachine,
  VALID_TRANSITIONS,
} from './state-machine/order-state-machine';

describe('OrderStateMachine', () => {
  let sm: OrderStateMachine;

  beforeEach(() => {
    sm = new OrderStateMachine();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Valid transitions
  // ─────────────────────────────────────────────────────────────────────────

  describe('valid transitions', () => {
    const validCases: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING, OrderStatus.CONFIRMED],
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED, OrderStatus.DISPATCHED],
      [OrderStatus.CONFIRMED, OrderStatus.DELIVERED],
      [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.DISPATCHED, OrderStatus.IN_TRANSIT],
      [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
      [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED],
      [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      [OrderStatus.IN_TRANSIT, OrderStatus.DISPUTED],
      [OrderStatus.DELIVERED, OrderStatus.DISPUTED],
      [OrderStatus.DISPUTED, OrderStatus.RESOLVED],
      [OrderStatus.RESOLVED, OrderStatus.DELIVERED],
      [OrderStatus.RESOLVED, OrderStatus.CANCELLED],
    ];

    it.each(validCases)(
      'allows %s → %s',
      (from: OrderStatus, to: OrderStatus) => {
        expect(sm.transition(from, to)).toBe(to);
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invalid transitions — every illegal edge must throw
  // ─────────────────────────────────────────────────────────────────────────

  describe('invalid transitions', () => {
    const invalidCases: [OrderStatus, OrderStatus][] = [
      // Terminal states cannot move forward
      [OrderStatus.DELIVERED, OrderStatus.DISPATCHED],
      [OrderStatus.DELIVERED, OrderStatus.IN_TRANSIT],
      [OrderStatus.DELIVERED, OrderStatus.CONFIRMED],
      [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED, OrderStatus.PENDING],
      [OrderStatus.CANCELLED, OrderStatus.CONFIRMED],
      [OrderStatus.CANCELLED, OrderStatus.DISPATCHED],
      [OrderStatus.CANCELLED, OrderStatus.IN_TRANSIT],
      [OrderStatus.CANCELLED, OrderStatus.DELIVERED],
      [OrderStatus.CANCELLED, OrderStatus.PENDING],
      // Skipping states
      [OrderStatus.PENDING, OrderStatus.DELIVERED],
      [OrderStatus.PENDING, OrderStatus.IN_TRANSIT],
      [OrderStatus.PENDING, OrderStatus.DISPATCHED],
      [OrderStatus.CONFIRMED, OrderStatus.IN_TRANSIT],
      [OrderStatus.DISPATCHED, OrderStatus.CONFIRMED],
      [OrderStatus.DISPATCHED, OrderStatus.DELIVERED],
      [OrderStatus.IN_TRANSIT, OrderStatus.CONFIRMED],
      [OrderStatus.IN_TRANSIT, OrderStatus.DISPATCHED],
      // Self-loops
      [OrderStatus.PENDING, OrderStatus.PENDING],
      [OrderStatus.CONFIRMED, OrderStatus.CONFIRMED],
    ];

    it.each(invalidCases)(
      'throws OrderTransitionException for %s → %s',
      (from: OrderStatus, to: OrderStatus) => {
        expect(() => sm.transition(from, to)).toThrow(OrderTransitionException);
      },
    );

    it('includes attemptedFrom, attemptedTo and allowedTransitions in the exception', () => {
      expect.assertions(4);
      try {
        sm.transition(OrderStatus.DELIVERED, OrderStatus.DISPATCHED);
      } catch (err) {
        expect(err).toBeInstanceOf(OrderTransitionException);
        const ex = err as OrderTransitionException;
        expect(ex.detail.attemptedFrom).toBe(OrderStatus.DELIVERED);
        expect(ex.detail.attemptedTo).toBe(OrderStatus.DISPATCHED);
        expect(ex.detail.allowedTransitions).toEqual([OrderStatus.DISPUTED]);
      }
    });

    it('lists remaining valid options when transition is rejected mid-flow', () => {
      expect.assertions(2);
      try {
        // CONFIRMED only allows DISPATCHED | DELIVERED | CANCELLED
        sm.transition(OrderStatus.CONFIRMED, OrderStatus.PENDING);
      } catch (err) {
        const ex = err as OrderTransitionException;
        expect(ex.detail.allowedTransitions).toContain(OrderStatus.DISPATCHED);
        expect(ex.detail.allowedTransitions).toContain(OrderStatus.CANCELLED);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAllowedTransitions
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllowedTransitions', () => {
    it('returns [CONFIRMED, CANCELLED] for PENDING', () => {
      expect(sm.getAllowedTransitions(OrderStatus.PENDING)).toEqual([
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ]);
    });

    it('returns [DISPATCHED, DELIVERED, CANCELLED] for CONFIRMED', () => {
      expect(sm.getAllowedTransitions(OrderStatus.CONFIRMED)).toEqual([
        OrderStatus.DISPATCHED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ]);
    });

    it('returns [IN_TRANSIT, CANCELLED] for DISPATCHED', () => {
      expect(sm.getAllowedTransitions(OrderStatus.DISPATCHED)).toEqual([
        OrderStatus.IN_TRANSIT,
        OrderStatus.CANCELLED,
      ]);
    });

    it('returns [DELIVERED, CANCELLED, DISPUTED] for IN_TRANSIT', () => {
      expect(sm.getAllowedTransitions(OrderStatus.IN_TRANSIT)).toEqual([
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.DISPUTED,
      ]);
    });

    it('returns [DISPUTED] for DELIVERED', () => {
      expect(sm.getAllowedTransitions(OrderStatus.DELIVERED)).toEqual([
        OrderStatus.DISPUTED,
      ]);
    });

    it('returns [RESOLVED] for DISPUTED', () => {
      expect(sm.getAllowedTransitions(OrderStatus.DISPUTED)).toEqual([
        OrderStatus.RESOLVED,
      ]);
    });

    it('returns [DELIVERED, CANCELLED] for RESOLVED', () => {
      expect(sm.getAllowedTransitions(OrderStatus.RESOLVED)).toEqual([
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ]);
    });

    it('returns [] for CANCELLED (terminal state)', () => {
      expect(sm.getAllowedTransitions(OrderStatus.CANCELLED)).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // replayFromEvents — state derivable by replaying event log
  // ─────────────────────────────────────────────────────────────────────────

  describe('replayFromEvents', () => {
    it('derives DELIVERED from the full happy-path sequence', () => {
      const events: OrderStatus[] = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.DISPATCHED,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
      ];
      expect(sm.replayFromEvents(events)).toBe(OrderStatus.DELIVERED);
    });

    it('derives CANCELLED after an early cancellation', () => {
      const events: OrderStatus[] = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ];
      expect(sm.replayFromEvents(events)).toBe(OrderStatus.CANCELLED);
    });

    it('derives PENDING from a single-event log', () => {
      expect(sm.replayFromEvents([OrderStatus.PENDING])).toBe(
        OrderStatus.PENDING,
      );
    });

    it('derives CONFIRMED after one transition', () => {
      expect(
        sm.replayFromEvents([OrderStatus.PENDING, OrderStatus.CONFIRMED]),
      ).toBe(OrderStatus.CONFIRMED);
    });

    it('throws when the event list is empty', () => {
      expect(() => sm.replayFromEvents([])).toThrow(
        'Cannot replay state: event list is empty',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // VALID_TRANSITIONS shape — exported map is complete and consistent
  // ─────────────────────────────────────────────────────────────────────────

  describe('VALID_TRANSITIONS constant', () => {
    it('covers all OrderStatus values', () => {
      const allStatuses = Object.values(OrderStatus);
      allStatuses.forEach((status) => {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('only references known OrderStatus values as targets', () => {
      const knownStatuses = new Set(Object.values(OrderStatus));
      Object.values(VALID_TRANSITIONS)
        .flat()
        .forEach((target) => {
          expect(knownStatuses).toContain(target);
        });
    });
  });
});
