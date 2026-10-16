import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('lets 5 requests per IP through in 10 minutes, refuses the 6th, and counts each IP alone', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 600_000 });
    const results = Array.from({ length: 6 }, (_, i) => limiter.allow('1.1.1.1', i * 1000));
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(limiter.allow('2.2.2.2', 6000)).toBe(true);
    expect(limiter.allow('1.1.1.1', 600_000)).toBe(true);
  });
});
