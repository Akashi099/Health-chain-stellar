import { SetMetadata } from '@nestjs/common';

export interface RateLimitConfig {
  limit: number;
  ttl: number; // in seconds
}

export const RATE_LIMIT_KEY = 'rate_limit';

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
