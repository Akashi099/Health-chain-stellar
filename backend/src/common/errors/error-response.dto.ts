import { ErrorCode } from './error-codes.enum';

/**
 * Standardized error response structure.
 * All API errors should conform to this format.
 */
export class ErrorResponse {
  code: ErrorCode;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    path?: string,
    details?: Record<string, unknown>,
  ) {
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.details = details;
  }
}
