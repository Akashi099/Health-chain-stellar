import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import {
  buildStandardErrorResponse,
  getReasonPhrase,
} from '../common/errors/standard-error-response';

import type { Request, Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  constructor(private readonly isProduction = false) {}

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = HttpStatus.TOO_MANY_REQUESTS;
    const raw = typeof exception.message === 'string' ? exception.message : '';
    const message =
      raw.replace(/^ThrottlerException:\s*/i, '').trim() ||
      'Rate limit exceeded. Please try again later.';

    response.status(status).json(
      buildStandardErrorResponse({
        statusCode: status,
        code: 'RATE_LIMIT_EXCEEDED',
        error: getReasonPhrase(status),
        message,
        domain: 'throttling',
        request,
        stack: exception.stack,
        includeStack: !this.isProduction,
      }),
    );
  }
}
