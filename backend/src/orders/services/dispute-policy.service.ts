import { ConflictException, Injectable } from '@nestjs/common';

import { OrderStatus } from '../enums/order-status.enum';
import { OrderEntity } from '../entities/order.entity';

/**
 * DisputePolicyService
 *
 * Single source of truth for all dispute business rules:
 *
 * 1. No duplicate open disputes — an order already in DISPUTED status
 *    cannot have a second dispute raised against it.
 * 2. Post-resolution constraint — once RESOLVED, a new dispute may only
 *    be raised if the order has since transitioned back to DELIVERED
 *    (i.e. the resolution was accepted and delivery confirmed).
 * 3. Only orders in IN_TRANSIT or DELIVERED status can enter DISPUTED.
 *    (This mirrors the state-machine edges but is enforced here as a
 *    named policy so the rule is auditable independently of the graph.)
 */
@Injectable()
export class DisputePolicyService {
  /** Statuses from which a dispute may be raised. */
  private static readonly DISPUTABLE_STATUSES = new Set<OrderStatus>([
    OrderStatus.IN_TRANSIT,
    OrderStatus.DELIVERED,
  ]);

  /**
   * Assert that a new dispute can be raised on the given order.
   *
   * @throws ConflictException when the order already has an open dispute.
   * @throws ConflictException when a resolved order has not yet been
   *         re-delivered (post-resolution constraint).
   */
  assertCanRaiseDispute(order: OrderEntity): void {
    // Rule 1 – no duplicate open disputes
    if (order.status === OrderStatus.DISPUTED) {
      throw new ConflictException(
        `Order '${order.id}' already has an open dispute. Resolve it before raising a new one.`,
      );
    }

    // Rule 2 – post-resolution: only DELIVERED orders may be re-disputed
    if (
      order.status === OrderStatus.RESOLVED ||
      (order.disputeId !== null &&
        !DisputePolicyService.DISPUTABLE_STATUSES.has(order.status))
    ) {
      throw new ConflictException(
        `Order '${order.id}' was previously disputed. A new dispute may only be raised after the order is re-delivered.`,
      );
    }

    // Rule 3 – must be in a disputable status
    if (!DisputePolicyService.DISPUTABLE_STATUSES.has(order.status)) {
      throw new ConflictException(
        `Order '${order.id}' cannot be disputed from status '${order.status}'. Only IN_TRANSIT or DELIVERED orders may be disputed.`,
      );
    }
  }

  /**
   * Assert that the order is in DISPUTED status before resolving.
   *
   * @throws ConflictException when the order is not currently disputed.
   */
  assertCanResolveDispute(order: OrderEntity): void {
    if (order.status !== OrderStatus.DISPUTED) {
      throw new ConflictException(
        `Order '${order.id}' is not currently disputed (status: '${order.status}').`,
      );
    }
  }
}
