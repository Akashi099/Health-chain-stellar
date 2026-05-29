import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BloodRequestReservationEntity, ReservationStatus } from '../entities/blood-request-reservation.entity';
import { BloodRequestEntity } from '../entities/blood-request.entity';
import { InsufficientInventoryException } from '../../common/exceptions/domain.exception';

@Injectable()
export class BloodRequestReservationService {
  constructor(
    @InjectRepository(BloodRequestReservationEntity)
    private readonly reservationRepo: Repository<BloodRequestReservationEntity>,
  ) {}

  /**
   * Create a new reservation
   */
  async createReservation(
    requestId: string,
    requestItemId: string | undefined,
    bloodBankId: string,
    bloodUnitId: string,
    quantityMl: number,
    expiresAtTimestamp: number,
  ): Promise<BloodRequestReservationEntity> {
    if (quantityMl <= 0) {
      throw new BadRequestException('Reservation quantity must be greater than zero');
    }

    const reservation = this.reservationRepo.create({
      requestId,
      requestItemId,
      bloodBankId,
      bloodUnitId,
      quantityMl,
      expiresAt: expiresAtTimestamp,
      status: ReservationStatus.RESERVED,
    });

    return this.reservationRepo.save(reservation);
  }

  /**
   * Find active reservations for a request
   */
  async findActiveReservations(requestId: string): Promise<BloodRequestReservationEntity[]> {
    return this.reservationRepo.find({
      where: [
        { requestId, status: ReservationStatus.RESERVED },
        { requestId, status: ReservationStatus.PARTIALLY_ALLOCATED },
        { requestId, status: ReservationStatus.ALLOCATED },
      ],
    });
  }

  /**
   * Find reservations for a specific request item
   */
  async findReservationsForItem(
    requestId: string,
    requestItemId: string,
  ): Promise<BloodRequestReservationEntity[]> {
    return this.reservationRepo.find({
      where: { requestId, requestItemId },
    });
  }

  /**
   * Allocate a reservation
   */
  async allocateReservation(
    reservationId: string,
    currentTimestamp: number,
  ): Promise<BloodRequestReservationEntity> {
    const reservation = await this.reservationRepo.findOne({ where: { id: reservationId } });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (reservation.isExpired(currentTimestamp)) {
      throw new ConflictException(
        `Reservation ${reservationId} has expired and cannot be allocated`,
      );
    }

    reservation.allocate(currentTimestamp);
    return this.reservationRepo.save(reservation);
  }

  /**
   * Release a reservation
   */
  async releaseReservation(
    reservationId: string,
    currentTimestamp: number,
  ): Promise<BloodRequestReservationEntity> {
    const reservation = await this.reservationRepo.findOne({ where: { id: reservationId } });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (reservation.status === ReservationStatus.RELEASED) {
      throw new ConflictException(`Reservation ${reservationId} is already released`);
    }

    reservation.release(currentTimestamp);
    return this.reservationRepo.save(reservation);
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(currentTimestamp: number): Promise<number> {
    const result = await this.reservationRepo
      .createQueryBuilder()
      .update(BloodRequestReservationEntity)
      .set({ status: ReservationStatus.EXPIRED })
      .where('status != :released', { released: ReservationStatus.RELEASED })
      .andWhere('status != :expired', { expired: ReservationStatus.EXPIRED })
      .andWhere('expires_at < :now', { now: currentTimestamp })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get reservation history for a request
   */
  async getReservationHistory(
    requestId: string,
  ): Promise<BloodRequestReservationEntity[]> {
    return this.reservationRepo.find({
      where: { requestId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Calculate total reserved quantity for a request
   */
  async getTotalReserved(requestId: string): Promise<number> {
    const reservations = await this.findActiveReservations(requestId);
    return reservations.reduce((sum, res) => sum + res.quantityMl, 0);
  }

  /**
   * Calculate reserved quantity by blood type for a request
   */
  async getReservedByBloodType(requestId: string, bloodBankId: string): Promise<number> {
    const reservations = await this.reservationRepo.find({
      where: { requestId, bloodBankId },
    });

    return reservations.reduce((sum, res) => {
      if (res.status !== ReservationStatus.RELEASED && res.status !== ReservationStatus.EXPIRED) {
        return sum + res.quantityMl;
      }
      return sum;
    }, 0);
  }
}
