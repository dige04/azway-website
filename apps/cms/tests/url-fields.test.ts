// URL fields end up in href / <link rel=canonical> / redirects on the web:
// the schema regex is the guard against javascript: and open redirects.
import { describe, expect, it } from 'vitest';
import heroSlide from '../src/components/home/hero-slide.json';
import seo from '../src/components/shared/seo.json';
import redirect from '../src/api/redirect/content-types/redirect/schema.json';
import { normalizeRedirectPath } from '../src/utils/redirect-path';

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
    const canonical = '/tour-h%E1%BA%A1-long';
    for (const typed of [' https://old.azway.vn/tour-h%e1%ba%a1-long/?p=1#top ', '/tour-hạ-long', '/tour-h%E1%BA%A1-long/']) {
      expect(normalizeRedirectPath(typed), typed).toBe(canonical);
    }
    expect(normalizeRedirectPath('/bai viet%20cu')).toBe('/bai%20viet%20cu');
    expect(normalizeRedirectPath('tour-cu')).toBe('/tour-cu');
    expect(normalizeRedirectPath('/')).toBe('/');
    expect(ok(canonical)).toBe(true);
    expect(ok(normalizeRedirectPath('/bai viet%20cu'))).toBe(true);
    // Saving again changes nothing, even for an encoded "%" or a stray one.
    for (const typed of ['/tour-hạ-long', '/a%2541', '/50%off', '/50%', '/a%25%zz/b', '/a%2Fb', '/bai viet%20cu/']) {
      const once = normalizeRedirectPath(typed);
      expect(normalizeRedirectPath(once), typed).toBe(once);
    }
    expect(normalizeRedirectPath('/a%2541')).toBe('/a%2541');
    for (const hostile of ['//evil.com', '/\\evil.com', 'https://old.azway.vn//evil.com']) {
      expect(ok(normalizeRedirectPath(hostile)), hostile).toBe(false);
    }
  });
});
