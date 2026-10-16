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

  it('redirect.from is stored as a decoded path the schema accepts', () => {
    const ok = matcher(redirect.attributes.from.regex);
    expect(normalizeRedirectPath(' https://old.azway.vn/tour-h%E1%BA%A1-long/?p=1#top ')).toBe('/tour-hạ-long');
    expect(normalizeRedirectPath('tour-cu')).toBe('/tour-cu');
    expect(normalizeRedirectPath('/')).toBe('/');
    expect(ok('/tour-hạ-long')).toBe(true);
    expect(ok(normalizeRedirectPath('//evil.com'))).toBe(false);
  });
});
