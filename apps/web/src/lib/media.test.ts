import { afterEach, expect, it, vi } from 'vitest';
import { mediaUrl } from './media';

afterEach(() => vi.unstubAllEnvs());

it('resolves Strapi local /uploads paths against CMS_URL and keeps absolute R2 URLs', () => {
  vi.stubEnv('CMS_URL', 'http://localhost:1337/');
  expect(mediaUrl('/uploads/ha_long_123.jpg')).toBe('http://localhost:1337/uploads/ha_long_123.jpg');
  expect(mediaUrl('https://media.azway.vn/ha_long_123.jpg')).toBe('https://media.azway.vn/ha_long_123.jpg');
  expect(mediaUrl(null)).toBeNull();
});
