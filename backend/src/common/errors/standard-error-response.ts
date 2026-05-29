import { HttpStatus } from '@nestjs/common';

import type { Request } from 'express';

export interface StandardErrorResponse {
  success: false;
  error: {
    statusCode: number;
    code: string;
    error: string;
    message: string;
    details?: unknown;
    domain?: string;
    requestId: string;
    path: string;
    timestamp: string;
    translationKey?: string;
    translatedMessage?: string;
    stack?: string;
  };
}

export interface StandardErrorOptions {
  statusCode: number;
  code: string;
  error: string;
  message: string;
  request?: Request;
  details?: unknown;
  domain?: string;
  translationKey?: string;
  translatedMessage?: string;
  stack?: string;
  includeStack?: boolean;
}

export function getRequestId(request?: Request): string {
  return request?.correlationId ?? request?.headers['x-correlation-id']?.toString() ?? 'unknown';
}

export function buildStandardErrorResponse(
  options: StandardErrorOptions,
): StandardErrorResponse {
  return {
    success: false,
    error: {
      statusCode: options.statusCode,
      code: options.code,
      error: options.error,
      message: options.message,
      details: options.details,
      domain: options.domain,
      requestId: getRequestId(options.request),
      path: options.request?.originalUrl ?? options.request?.url ?? 'unknown',
      timestamp: new Date().toISOString(),
      translationKey: options.translationKey,
      translatedMessage: options.translatedMessage,
      stack: options.includeStack ? options.stack : undefined,
    },
  };
}

export function getReasonPhrase(statusCode: number): string {
  const map: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Bad Request',
    [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
    [HttpStatus.FORBIDDEN]: 'Forbidden',
    [HttpStatus.NOT_FOUND]: 'Not Found',
    [HttpStatus.CONFLICT]: 'Conflict',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
    [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  };

  return map[statusCode] ?? 'Error';
}