/**
 * Exponential back-off retry utility for Soroban transaction submissions.
 *
 * Config (issue #452):
 *   initial delay : 500 ms
 *   factor        : 2
 *   max retries   : 5
 *   max delay     : 30 000 ms
 */

export interface RetryOptions {
  /** Initial delay in ms before the first retry. Default: 500 */
  initialDelayMs?: number;
  /** Multiplicative factor applied on each retry. Default: 2 */
  factor?: number;
  /** Maximum number of retry attempts (not counting the first call). Default: 5 */
  maxRetries?: number;
  /** Upper bound for any single delay. Default: 30 000 */
  maxDelayMs?: number;
}

const DEFAULTS: Required<RetryOptions> = {
  initialDelayMs: 500,
  factor: 2,
  maxRetries: 5,
  maxDelayMs: 30_000,
};

/** Returns the delay (ms) for the given attempt index (0-based). */
export function computeExponentialDelay(
  attempt: number,
  opts: Required<RetryOptions>,
): number {
  const raw = opts.initialDelayMs * Math.pow(opts.factor, attempt);
  return Math.min(raw, opts.maxDelayMs);
}

/**
 * Executes `fn` and retries on failure with exponential back-off.
 *
 * @param fn      - Async function to execute
 * @param opts    - Back-off configuration
 * @param onRetry - Optional callback invoked before each retry (useful for logging)
 * @returns Resolved value of `fn`
 * @throws Last error after all retries are exhausted
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
  onRetry?: (attempt: number, error: Error, delayMs: number) => void,
): Promise<T> {
  const config: Required<RetryOptions> = { ...DEFAULTS, ...opts };
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === config.maxRetries) break;

      const delayMs = computeExponentialDelay(attempt, config);
      onRetry?.(attempt + 1, lastError, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
