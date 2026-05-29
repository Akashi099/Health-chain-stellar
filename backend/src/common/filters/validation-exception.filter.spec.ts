import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';

import { ValidationExceptionFilter } from './validation-exception.filter';

describe('ValidationExceptionFilter', () => {
  it('renders user-friendly validation details', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      correlationId: 'req-val',
      method: 'POST',
      originalUrl: '/api/v1/orders',
      headers: { 'accept-language': 'en-US' },
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const filter = new ValidationExceptionFilter(false);
    filter.catch(
      new BadRequestException({
        message: 'Invalid query parameters',
        errors: ['bloodType must be valid', 'quantity must be positive'],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_FAILED',
          domain: 'validation',
          details: ['bloodType must be valid', 'quantity must be positive'],
          requestId: 'req-val',
        }),
      }),
    );
  });
});