import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../errors/error-codes.enum';

export interface DomainExceptionPayload {
  code: ErrorCode;
  message: string;
  domain: string;
  details?: unknown;
  translationKey?: string;
}

export class DomainException extends HttpException {
  readonly code: ErrorCode;
  readonly domain: string;
  readonly details?: unknown;
  readonly translationKey?: string;

  constructor(status: HttpStatus, payload: DomainExceptionPayload, cause?: unknown) {
    super(
      {
        statusCode: status,
        code: payload.code,
        message: payload.message,
        domain: payload.domain,
        details: payload.details,
        translationKey: payload.translationKey,
      },
      status,
      { cause },
    );

    this.code = payload.code;
    this.domain = payload.domain;
    this.details = payload.details;
    this.translationKey = payload.translationKey;
  }
}

export class BlockchainException extends DomainException {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super(
      HttpStatus.BAD_GATEWAY,
      {
        code: ErrorCode.BLOCKCHAIN_TX_FAILED,
        message,
        domain: 'blockchain',
        details,
        translationKey: 'errors.blockchain_failed',
      },
      cause,
    );
  }
}

export class InsufficientInventoryException extends DomainException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.CONFLICT, {
      code: ErrorCode.INVENTORY_INSUFFICIENT,
      message,
      domain: 'inventory',
      details,
      translationKey: 'errors.inventory_insufficient',
    });
  }
}

export class InventoryReservationException extends DomainException {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super(
      HttpStatus.CONFLICT,
      {
        code: ErrorCode.INVENTORY_RESERVATION_FAILED,
        message,
        domain: 'inventory',
        details,
        translationKey: 'errors.inventory_reservation_failed',
      },
      cause,
    );
  }
}

export class BloodRequestNotFoundException extends DomainException {
  constructor(requestId: string) {
    super(HttpStatus.NOT_FOUND, {
      code: ErrorCode.BLOOD_REQUEST_NOT_FOUND,
      message: `Blood request ${requestId} was not found.`,
      domain: 'blood_request',
    });
  }
}

export class ValidationDomainException extends DomainException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.BAD_REQUEST, {
      code: ErrorCode.VALIDATION_FAILED,
      message,
      domain: 'validation',
      details,
      translationKey: 'errors.validation_failed',
    });
  }
}