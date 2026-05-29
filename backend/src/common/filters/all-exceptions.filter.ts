import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { AppError, IrrecoverableError, RecoverableError } from '../errors/app-errors';
import { ErrorCode } from '../errors/error-codes.enum';
import {
  buildStandardErrorResponse,
  getReasonPhrase,
} from '../errors/standard-error-response';
import { DomainException } from '../exceptions/domain.exception';
import { translateError } from '../errors/error-translations';

import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly isProduction: boolean) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, code, message, details, domain, translationKey } =
      this.extractExceptionData(exception);
    const translatedMessage = translateError(
      translationKey,
      request.headers['accept-language'],
      message,
    );

    const stack = exception instanceof Error ? exception.stack : undefined;
    const requestId = request.correlationId ?? 'unknown';

    this.logger.error(
      `[${requestId}] ${request.method} ${request.originalUrl} -> ${statusCode} ${code}: ${message}`,
      stack,
    );

    response.status(statusCode).json(
      buildStandardErrorResponse({
        statusCode,
        code,
        error: getReasonPhrase(statusCode),
        message,
        translatedMessage,
        translationKey,
        details,
        domain,
        request,
        stack,
        includeStack: !this.isProduction,
      }),
    );
  }

  private extractExceptionData(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
    domain?: string;
    translationKey?: string;
  } {
    if (exception instanceof DomainException) {
      const payload = exception.getResponse() as Record<string, unknown>;
      return {
        statusCode: exception.getStatus(),
        code: String(payload.code ?? ErrorCode.INTERNAL_SERVER_ERROR),
        message: String(payload.message ?? exception.message),
        details: payload.details,
        domain: typeof payload.domain === 'string' ? payload.domain : undefined,
        translationKey:
          typeof payload.translationKey === 'string'
            ? payload.translationKey
            : undefined,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const body = typeof response === 'string' ? { message: response } : response;
      const record = body as Record<string, unknown>;

      return {
        statusCode: exception.getStatus(),
        code: String(record.code ?? this.defaultErrorCode(exception.getStatus())),
        message: this.resolveMessage(record.message ?? exception.message),
        details: record.errors ?? record.details,
        domain: typeof record.domain === 'string' ? record.domain : undefined,
        translationKey:
          typeof record.translationKey === 'string'
            ? record.translationKey
            : undefined,
      };
    }

    if (exception instanceof IrrecoverableError) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: exception.message,
        details: exception.context,
        domain: exception.domain,
      };
    }

    if (exception instanceof RecoverableError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: exception.message,
        details: exception.context,
      };
    }

    if (exception instanceof AppError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: exception.message,
        details: exception.context,
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: exception.message,
        translationKey: 'errors.internal_server_error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred.',
      translationKey: 'errors.internal_server_error',
    };
  }

  private resolveMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return typeof message === 'string' ? message : 'Request failed.';
  }

  private defaultErrorCode(statusCode: number): ErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.INVALID_INPUT;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.RESOURCE_CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}