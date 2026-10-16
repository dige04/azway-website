// URL fields end up in href / <link rel=canonical> / redirects on the web:
// the schema regex is the guard against javascript: and open redirects.
import { describe, expect, it } from 'vitest';
import heroSlide from '../src/components/home/hero-slide.json';
import seo from '../src/components/shared/seo.json';
import redirect from '../src/api/redirect/content-types/redirect/schema.json';
import { normalizeRedirectPath } from '../src/utils/redirect-path';
import vectors from './redirect-paths.json';

const matcher = (regex: string) => (value: string) => new RegExp(regex).test(value);
const hostile = ['//evil.com', '/\\evil.com', 'http://a.com/x', 'javascript:alert(1)', 'tour/x', 'https://'];

describe('URL fields', () => {
  it.each([
    ['home.hero-slide.ctaUrl', heroSlide.attributes.ctaUrl.regex],
    ['redirect.to', redirect.attributes.to.regex],
  ])('%s accepts site paths and https only', (_name, regex) => {
    const ok = matcher(regex);
    for (const value of ['/', '/tour/x?a=1#b', 'https://a.com/x']) expect(ok(value), value).toBe(true);
    for (const value of hostile) expect(ok(value), value).toBe(false);
  });

  it('shared.seo.canonicalUrl accepts absolute https only', () => {
    const ok = matcher(seo.attributes.canonicalUrl.regex);
    expect(ok('https://a.com/x')).toBe(true);
    for (const value of ['/tour/x', ...hostile]) expect(ok(value), value).toBe(false);
  });

  it('redirect.from is stored as one canonical encoded path, never as a host', () => {
    const ok = matcher(redirect.attributes.from.regex);
    // Shared with apps/web/src/lib/redirect-path.test.ts: the web looks paths up in this form.
    for (const [typed, canonical] of vectors) {
      expect(normalizeRedirectPath(typed), typed).toBe(canonical);
      // Saving again changes nothing, even for an encoded "%" or a stray one.
      expect(normalizeRedirectPath(canonical), typed).toBe(canonical);
      expect(ok(canonical), typed).toBe(true);
    }
    for (const hostile of ['//evil.com', '/\\evil.com', 'https://old.azway.vn//evil.com']) {
      expect(ok(normalizeRedirectPath(hostile)), hostile).toBe(false);
    }
  });
});
