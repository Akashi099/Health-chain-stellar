import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';

import { VerifyQrDto } from './dto/verify-qr.dto';
import { BloodUnitEntity } from './entities/blood-unit.entity';
import {
  QrVerificationLogEntity,
  QrVerificationResult,
} from './entities/qr-verification-log.entity';

interface QrPayload {
  unitNumber: string;
  bloodType: string;
  bankId: string;
}

@Injectable()
export class QrVerificationService {
  private readonly logger = new Logger(QrVerificationService.name);

  constructor(
    @InjectRepository(BloodUnitEntity)
    private readonly bloodUnitRepo: Repository<BloodUnitEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(QrVerificationLogEntity)
    private readonly logRepo: Repository<QrVerificationLogEntity>,
  ) {}

  async verify(dto: VerifyQrDto): Promise<{ verified: boolean; unitNumber: string }> {
    let payload: QrPayload;
    try {
      payload = JSON.parse(dto.qrPayload) as QrPayload;
    } catch {
      throw new BadRequestException('Invalid QR payload format');
    }

    const unit = await this.bloodUnitRepo.findOne({
      where: { unitNumber: payload.unitNumber },
    });
    if (!unit) throw new NotFoundException(`Blood unit ${payload.unitNumber} not found`);

    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);

    const isMatch =
      unit.bloodType === order.bloodType &&
      order.status === OrderStatus.IN_TRANSIT;

    const failureReason = !isMatch
      ? unit.bloodType !== order.bloodType
        ? `Blood type mismatch: unit is ${unit.bloodType}, order requires ${order.bloodType}`
        : `Order status is ${order.status}, expected IN_TRANSIT`
      : null;

    await this.logRepo.save(
      this.logRepo.create({
        unitNumber: unit.unitNumber,
        orderId: dto.orderId,
        scannedBy: dto.scannedBy,
        result: isMatch ? QrVerificationResult.MATCH : QrVerificationResult.MISMATCH,
        failureReason,
      }),
    );

    if (!isMatch) {
      this.logger.warn(`QR mismatch for order ${dto.orderId}: ${failureReason}`);
      throw new BadRequestException(failureReason ?? 'Unit does not match order');
    }

    this.logger.log(`QR verified: unit ${unit.unitNumber} matched order ${dto.orderId}`);
    return { verified: true, unitNumber: unit.unitNumber };
  }

  async getVerificationHistory(orderId: string): Promise<QrVerificationLogEntity[]> {
    return this.logRepo.find({
      where: { orderId },
      order: { scannedAt: 'DESC' },
    });
  }
}
