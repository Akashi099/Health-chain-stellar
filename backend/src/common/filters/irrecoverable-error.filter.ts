import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { IrrecoverableError, RecoverableError } from '../errors/app-errors';
import {
  buildStandardErrorResponse,
  getReasonPhrase,
} from '../errors/standard-error-response';
import { translateError } from '../errors/error-translations';

import type { Request, Response } from 'express';

/**
 * Global filter that intercepts AppError subclasses and returns
 * structured, deterministic HTTP responses.
 *
 * Irrecoverable errors → 422 Unprocessable Entity with a reference ID.
 * Recoverable errors   → 503 Service Unavailable (safe to retry).
 */
@Catch(IrrecoverableError, RecoverableError)
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  constructor(private readonly isProduction = false) {}

  catch(exception: IrrecoverableError | RecoverableError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (exception instanceof IrrecoverableError) {
      this.logger.error(
        `[${request.correlationId ?? 'unknown'}] [IrrecoverableError] domain=${exception.domain} message=${exception.message}`,
        exception.stack,
      );

      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json(
        buildStandardErrorResponse({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'IRRECOVERABLE_FAILURE',
          error: getReasonPhrase(HttpStatus.UNPROCESSABLE_ENTITY),
          message: exception.message,
          translatedMessage: translateError(
            undefined,
            request.headers['accept-language'],
            exception.message,
          ),
          domain: exception.domain,
          details: {
            ...exception.context,
            failureRecordId:
              (exception.context['failureRecordId'] as string) ?? null,
          },
          request,
          stack: exception.stack,
          includeStack: !this.isProduction,
        }),
      );
    } else {
      this.logger.warn(
        `[${request.correlationId ?? 'unknown'}] [RecoverableError] message=${exception.message}`,
      );

      response.status(HttpStatus.SERVICE_UNAVAILABLE).json(
        buildStandardErrorResponse({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'TRANSIENT_FAILURE',
          error: getReasonPhrase(HttpStatus.SERVICE_UNAVAILABLE),
          message: exception.message,
          translatedMessage: translateError(
            undefined,
            request.headers['accept-language'],
            exception.message,
          ),
          details: {
            ...exception.context,
            retryable: true,
          },
          request,
          stack: exception.stack,
          includeStack: !this.isProduction,
        }),
      );
    }
  }
}
