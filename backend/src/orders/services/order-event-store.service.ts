import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, Repository } from 'typeorm';

import { assertMonotonicTimestamp } from '../../common/timestamp/monotonic-timestamp.util';
import { OrderEventEntity } from '../entities/order-event.entity';
import { OrderEventType } from '../enums/order-event-type.enum';
import { OrderStatus } from '../enums/order-status.enum';

export interface CreateOrderEventDto {
  orderId: string;
  eventType: OrderEventType;
  payload: Record<string, any>;
  actorId?: string;
}

/**
 * Maps each OrderEventType to the OrderStatus it represents, so that
 * replaying the event log always produces the correct current state.
 */
const EVENT_TO_STATUS: Record<OrderEventType, OrderStatus> = {
  [OrderEventType.ORDER_CREATED]: OrderStatus.PENDING,
  [OrderEventType.ORDER_CONFIRMED]: OrderStatus.CONFIRMED,
  [OrderEventType.ORDER_DISPATCHED]: OrderStatus.DISPATCHED,
  [OrderEventType.ORDER_IN_TRANSIT]: OrderStatus.IN_TRANSIT,
  [OrderEventType.ORDER_DELIVERED]: OrderStatus.DELIVERED,
  [OrderEventType.ORDER_CANCELLED]: OrderStatus.CANCELLED,
  [OrderEventType.ORDER_DISPUTED]: OrderStatus.DISPUTED,
  [OrderEventType.ORDER_RESOLVED]: OrderStatus.RESOLVED,
};

@Injectable()
export class OrderEventStoreService {
  constructor(
    @InjectRepository(OrderEventEntity)
    private readonly eventRepo: Repository<OrderEventEntity>,
  ) {}

  /**
   * Appends a new immutable event row to the order_events table.
   *
   * Monotonic-timestamp guard: if a previous event exists for this order,
   * the incoming wall-clock time must be strictly after the last event's
   * timestamp.  This prevents out-of-order or back-dated events from being
   * committed and keeps the audit log temporally consistent.
   */
  async persistEvent(dto: CreateOrderEventDto): Promise<OrderEventEntity> {
    return this.persistEventWithManager(this.eventRepo.manager, dto);
  }

  /**
   * Same as persistEvent but uses the provided EntityManager so it can
   * participate in a caller-managed QueryRunner transaction.
   */
  async persistEventWithManager(
    manager: EntityManager,
    dto: CreateOrderEventDto,
  ): Promise<OrderEventEntity> {
    const lastEvents = await manager.find(OrderEventEntity, {
      where: { orderId: dto.orderId },
      order: { timestamp: 'DESC' },
      take: 1,
    });

    if (lastEvents.length > 0) {
      const now = new Date();
      assertMonotonicTimestamp(
        lastEvents[0].timestamp,
        now,
        `order event '${dto.eventType}' for order '${dto.orderId}'`,
      );
    }

    const entity = manager.create(OrderEventEntity, {
      orderId: dto.orderId,
      eventType: dto.eventType,
      payload: dto.payload,
      actorId: dto.actorId ?? null,
    });
    return manager.save(OrderEventEntity, entity);
  }

  /**
   * Returns the full, chronologically-ordered event log for an order.
   * This is what the GET /orders/:id/history endpoint surfaces.
   */
  async getOrderHistory(orderId: string): Promise<OrderEventEntity[]> {
    return this.eventRepo.find({
      where: { orderId },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Derives the current OrderStatus by replaying all persisted events
   * for the given order.  The status is always the one carried by the
   * most-recent event in the log.
   *
   * This guarantees that the state is fully derivable from the event store
   * alone, independent of any mutable status column on the orders table.
   */
  async replayOrderState(orderId: string): Promise<OrderStatus> {
    const events = await this.getOrderHistory(orderId);

    if (events.length === 0) {
      throw new NotFoundException(
        `No events found for order '${orderId}'. Cannot replay state.`,
      );
    }

    const lastEventType = events[events.length - 1].eventType as OrderEventType;
    const status = EVENT_TO_STATUS[lastEventType];

    if (!status) {
      throw new Error(
        `Cannot map event type '${lastEventType}' to an OrderStatus.`,
      );
    }

    return status;
  }
}
