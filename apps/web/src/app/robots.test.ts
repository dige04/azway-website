import { afterEach, expect, it, vi } from 'vitest';
import robots from './robots';

afterEach(() => {
  vi.unstubAllEnvs();
});

it('staging (SITE_NOINDEX=1): robots.txt disallows everything and lists no sitemap', () => {
  vi.stubEnv('SITE_NOINDEX', '1');
  expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
});
