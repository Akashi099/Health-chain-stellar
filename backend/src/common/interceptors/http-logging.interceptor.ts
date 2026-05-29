import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';
import { Logger as WinstonLogger } from 'winston';

import { sanitize } from '../logger/logger.module';

import type { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger | WinstonLogger;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly winstonLogger: WinstonLogger,
  ) {
    this.logger = winstonLogger;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();
    const correlationId = req.correlationId ?? 'unknown';

    this.winstonLogger.info('Incoming request', {
      correlationId,
      method: req.method,
      path: req.path,
      body: sanitize(req.body),
      query: sanitize(req.query),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.winstonLogger.info('Outgoing response', {
            correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          });
        },
        error: (err: Error) => {
          this.winstonLogger.error('Request error', {
            correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            error: err.message,
          });
        },
      }),
    );
  }
}
