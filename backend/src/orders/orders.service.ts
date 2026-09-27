import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  PaginatedResponse,
  PaginationQueryDto,
  PaginationUtil,
} from '../common/pagination';
import { OrgVerificationLifecycleService } from '../organizations/services/org-verification-lifecycle.service';
import { RestrictionLevel } from '../organizations/enums/org-lifecycle.enum';
import {
  OrderConfirmedEvent,
  OrderCancelledEvent,
  OrderStatusUpdatedEvent,
  OrderRiderAssignedEvent,
  OrderDispatchedEvent,
  OrderInTransitEvent,
  OrderDeliveredEvent,
  OrderDisputedEvent,
  OrderResolvedEvent,
} from '../events';
import { InventoryService } from '../inventory/inventory.service';
import { ApprovalService } from '../approvals/approval.service';
import { ApprovalActionType } from '../approvals/enums/approval.enum';
import { SlaService } from '../sla/sla.service';
import { SlaStage } from '../sla/enums/sla-stage.enum';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryParamsDto } from './dto/order-query-params.dto';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { OrderEventEntity } from './entities/order-event.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderEventType } from './enums/order-event-type.enum';
import { OrderStatus } from './enums/order-status.enum';
import { RequestStatusAction } from './enums/request-status-action.enum';
import { OrderStateMachine } from './state-machine/order-state-machine';
import { Order } from './types/order.types';
import { OrderEventStoreService } from './services/order-event-store.service';
import { OrderFeeService } from './services/order-fee.service';
import { RequestStatusService } from './services/request-status.service';
import { FeePreviewDto } from '../fee-policy/dto/fee-policy.dto';
import {
  TenantActorContext,
  assertTenantAccess,
} from '../common/tenant/tenant-scope.util';
import {
  SecurityEventLoggerService,
  SecurityEventType,
} from '../user-activity/security-event-logger.service';

/**
 * Whitelist of columns that may be used as the ORDER BY target for
 * `findAllWithFilters`. Keys are the values accepted from the client
 * (`sortBy`), values are the actual entity column names. This prevents
 * user-supplied strings from being interpolated into the SQL ORDER BY
 * clause (SQL injection).
 */
const ORDER_SORT_COLUMNS: Record<string, string> = {
  placedAt: 'placedAt',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
  status: 'status',
  totalAmount: 'totalAmount',
  quantity: 'quantity',
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly stateMachine: OrderStateMachine,
    private readonly eventStore: OrderEventStoreService,
    private readonly inventoryService: InventoryService,
    private readonly requestStatusService: RequestStatusService,
    private readonly orderFeeService: OrderFeeService,
    private readonly orgVerificationLifecycleService: OrgVerificationLifecycleService,
    private readonly approvalService: ApprovalService,
    private readonly slaService: SlaService,
    private readonly outboxService: OutboxService,
    private readonly securityEventLogger: SecurityEventLoggerService,
  ) {}

  async findAll(
    status?: string,
    hospitalId?: string,
    pagination: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<OrderEntity>> {
    const { page = 1, pageSize = 25 } = pagination;
    const where: Partial<OrderEntity> = {};
    if (status) where.status = status as OrderStatus;
    if (hospitalId) where.hospitalId = hospitalId;
    const [orders, totalCount] = await this.orderRepo.findAndCount({
      where,
      order: { placedAt: 'DESC' },
      take: pageSize,
      skip: PaginationUtil.calculateSkip(page, pageSize),
    });
    return PaginationUtil.createResponse(orders, page, pageSize, totalCount);
  }

  async findAllWithFilters(
    params: OrderQueryParamsDto,
    actor?: TenantActorContext,
  ): Promise<PaginatedResponse<Order>> {
    const {
      hospitalId,
      page = 1,
      pageSize = 25,
      sortBy = 'placedAt',
      sortOrder = 'desc',
    } = params;

    const isAdmin = (actor?.role ?? '').toLowerCase() === 'admin';

    // Non-admins are always scoped to their own organization. An org-less
    // non-admin (e.g. rider, dispatcher, donor) must not be able to list
    // orders for an arbitrary caller-supplied hospitalId.
    if (actor && !isAdmin && !actor.organizationId) {
      return PaginationUtil.createResponse([], page, pageSize, 0);
    }

    const query = this.orderRepo.createQueryBuilder('order');

    if (actor && !isAdmin) {
      // Match orders where the actor's org is either the hospital or the
      // blood bank, so blood-bank tenants see their orders too.
      query.where(
        '(order.hospitalId = :orgId OR order.bloodBankId = :orgId)',
        { orgId: actor.organizationId },
      );
    } else if (hospitalId) {
      query.where('order.hospitalId = :hospitalId', { hospitalId });
    }

    if (params.startDate)
      query.andWhere('order.placedAt >= :startDate', {
        startDate: params.startDate,
      });
    if (params.endDate)
      query.andWhere('order.placedAt <= :endDate', { endDate: params.endDate });

    // Map the client-supplied sort key to a known, whitelisted column.
    // Never interpolate the raw `sortBy` value into the ORDER BY clause.
    const sortColumn = ORDER_SORT_COLUMNS[sortBy] ?? ORDER_SORT_COLUMNS.placedAt;
    const direction = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [items, total] = await query
      .orderBy(`order.${sortColumn}`, direction)
      .skip(PaginationUtil.calculateSkip(page, pageSize))
      .take(pageSize)
      .getManyAndCount();

    return PaginationUtil.createResponse(items as any, page, pageSize, total);
  }

  async findOne(id: string, actor?: TenantActorContext) {
    const order = await this.findOrderOrFail(id, actor);
    return { message: 'Order retrieved successfully', data: order };
  }

  async trackOrder(id: string, actor?: TenantActorContext) {
    const order = await this.findOrderOrFail(id, actor);
    const replayedStatus = await this.eventStore.replayOrderState(id);
    return {
      message: 'Order tracking information retrieved successfully',
      data: { id, status: order.status, replayedStatus },
    };
  }

  async getOrderHistory(
    orderId: string,
    actor?: TenantActorContext,
  ): Promise<OrderEventEntity[]> {
    await this.findOrderOrFail(orderId, actor);
    return this.eventStore.getOrderHistory(orderId);
  }

  async create(
    dto: CreateOrderDto,
    actorId?: string,
    actor?: TenantActorContext,
  ) {
    if (!dto.bloodBankId)
      throw new BadRequestException('bloodBankId is required');

    const isAdmin = (actor?.role ?? '').toLowerCase() === 'admin';
    if (!isAdmin) {
      if (!actor?.organizationId) {
        throw new ForbiddenException(
          'Caller is not associated with an organization',
        );
      }
      if (dto.hospitalId !== actor.organizationId) {
        throw new ForbiddenException(
          'Cannot create orders for another organization',
        );
      }
    }

    const restriction =
      await this.orgVerificationLifecycleService.getRestrictionLevel(
        dto.hospitalId,
      );
    if (restriction !== RestrictionLevel.NONE) {
      throw new ForbiddenException(
        'This hospital is restricted from creating new orders',
      );
    }
    const saved = await this.createOrderEntity(dto, actorId);
    if (
      saved.status === OrderStatus.CONFIRMED ||
      saved.status === OrderStatus.DISPATCHED
    ) {
      await this.orderFeeService.computeAndPersist(saved);
    }
    return { message: 'Order created successfully', data: saved };
  }

  async update(
    id: string,
    updateDto: UpdateOrderDto,
    actor?: TenantActorContext,
  ) {
    const order = await this.findOrderOrFail(id, actor);
    if (updateDto.deliveryAddress !== undefined)
      order.deliveryAddress = updateDto.deliveryAddress;
    if (updateDto.quantity !== undefined) {
      // Adjust the reservation to match the new quantity so that a later
      // cancellation restores exactly what is currently reserved. The
      // originally reserved amount is preserved for audit/reconciliation.
      const previousQuantity = Number(order.quantity);
      const nextQuantity = Number(updateDto.quantity);
      const delta = nextQuantity - previousQuantity;
      if (delta > 0) {
        await this.inventoryService.reserveStockOrThrow(
          order.bloodBankId ?? '',
          order.bloodType,
          delta,
        );
      } else if (delta < 0) {
        await this.inventoryService.restoreStockOrThrow(
          order.bloodBankId ?? '',
          order.bloodType,
          Math.abs(delta),
        );
      }
      order.quantity = updateDto.quantity;
      order.reservedQuantity = nextQuantity;
    }
    const updated = await this.orderRepo.save(order);
    return { message: 'Order updated successfully', data: updated };
  }

  async updateStatus(
    id: string,
    statusUpdate: UpdateRequestStatusDto | string,
    actorId?: string,
    actorRole?: string,
    actor?: TenantActorCo

  async remove(id: string, actorId?: string, actor?: TenantActorContext) {
    const order = await this.findOrderOrFail(id, actor);
    await this.dataSource.transaction(async (manager) => {
      await this.requestStatusService.applyStatusUpdate(
    

/* … truncated 6514 chars — edit only what you need near the top … */
