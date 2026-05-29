import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';

import { BlockchainException } from '../exceptions/domain.exception';

import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  it('formats domain exceptions with correlation IDs', () => {
    const json = jest.fn<void, [unknown]>();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      correlationId: 'req-123',
      method: 'POST',
      originalUrl: '/api/v1/blood-requests',
      headers: {},
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const filter = new AllExceptionsFilter(false);
    filter.catch(new BlockchainException('Chain unavailable'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    const responseBody = json.mock.calls[0]?.[0] as {
      success: boolean;
      error: {
        code: string;
        requestId: string;
        domain?: string;
        stack?: unknown;
      };
    };

    expect(responseBody.success).toBe(false);
    expect(responseBody.error.code).toBe('BLOCKCHAIN_TX_FAILED');
    expect(responseBody.error.requestId).toBe('req-123');
    expect(responseBody.error.domain).toBe('blockchain');
    expect(typeof responseBody.error.stack).toBe('string');
  });

  it('maps framework exceptions to standard responses', () => {
    const json = jest.fn<void, [unknown]>();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      correlationId: 'req-456',
      method: 'GET',
      originalUrl: '/api/v1/orders',
      headers: {},
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const filter = new AllExceptionsFilter(true);
    filter.catch(new BadRequestException('Invalid query'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const responseBody = json.mock.calls[0]?.[0] as {
      error: {
        code: string;
        requestId: string;
        stack?: unknown;
      };
    };

    expect(responseBody.error.code).toBe('INVALID_INPUT');
    expect(responseBody.error.requestId).toBe('req-456');
    expect(responseBody.error.stack).toBeUndefined();
  });
});
