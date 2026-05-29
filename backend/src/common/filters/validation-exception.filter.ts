import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';

import { ErrorCode } from '../errors/error-codes.enum';
import {
  buildStandardErrorResponse,
  getReasonPhrase,
} from '../errors/standard-error-response';
import { translateError } from '../errors/error-translations';

import type { Request, Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  constructor(private readonly isProduction: boolean) {}

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const payload = exception.getResponse() as string | Record<string, unknown>;
    const record = typeof payload === 'string' ? { message: payload } : payload;
    const details = this.extractValidationDetails(record);
    const message = typeof record.message === 'string'
      ? record.message
      : 'Validation failed for the submitted request.';
    const translatedMessage = translateError(
      'errors.validation_failed',
      request.headers['accept-language'],
      message,
    );

    this.logger.warn(
      `[${request.correlationId ?? 'unknown'}] Validation failed for ${request.method} ${request.originalUrl}`,
    );

    response.status(exception.getStatus()).json(
      buildStandardErrorResponse({
        statusCode: exception.getStatus(),
        code: ErrorCode.VALIDATION_FAILED,
        error: getReasonPhrase(exception.getStatus()),
        message,
        translatedMessage,
        translationKey: 'errors.validation_failed',
        details,
        domain: 'validation',
        request,
        stack: exception.stack,
        includeStack: !this.isProduction,
      }),
    );
  }

  private extractValidationDetails(payload: Record<string, unknown>): unknown {
    if (Array.isArray(payload.message)) {
      return payload.message.map((message) => ({ message }));
    }

    if (Array.isArray(payload.errors)) {
      return payload.errors;
    }

    return payload.details ?? [];
  }
}