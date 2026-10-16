import { afterEach, expect, it, vi } from 'vitest';
import type { Media } from './cms-types';
import { imageProps, mediaUrl } from './media';

afterEach(() => vi.unstubAllEnvs());

it('resolves Strapi local /uploads paths against CMS_URL and keeps absolute R2 URLs', () => {
  vi.stubEnv('CMS_URL', 'http://localhost:1337/');
  expect(mediaUrl('/uploads/ha_long_123.jpg')).toBe('http://localhost:1337/uploads/ha_long_123.jpg');
  expect(mediaUrl('https://media.azway.vn/ha_long_123.jpg')).toBe('https://media.azway.vn/ha_long_123.jpg');
  expect(mediaUrl(null)).toBeNull();
});

// FR-CMS-05: the media library saves a cleared alt text as "", which would
// make a product photo decorative to screen readers.
it('uses the fallback alt text when the CMS one is blank', () => {
  vi.stubEnv('CMS_URL', 'http://localhost:1337');
  const photo = { url: '/uploads/a.jpg', alternativeText: '', width: 800, height: 600 } as Media;
  expect(imageProps(photo, 'Hạ Long 2N1Đ')?.alt).toBe('Hạ Long 2N1Đ');
});
