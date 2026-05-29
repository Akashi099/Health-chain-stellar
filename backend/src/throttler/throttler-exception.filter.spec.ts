import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import { ThrottlerExceptionFilter } from './throttler-exception.filter';

describe('ThrottlerExceptionFilter', () => {
  it('returns JSON body with 429', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const filter = new ThrottlerExceptionFilter();
    filter.catch(
      new ThrottlerException('ThrottlerException: Too Many Requests'),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: expect.any(String),
        }),
      }),
    );
  });
});
