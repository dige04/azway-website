import { connection } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { normalizeRedirectPath } from '../../../cms/src/utils/redirect-path';
import vectors from '../../../cms/tests/redirect-paths.json';
import { movedOrNotFound, requestKey, storedKey } from './redirect';

// Outside a request, connection() throws: only whether it was called matters.
vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }));
vi.mock('./cms', () => ({ getRedirects: vi.fn(async () => Promise.reject(new Error('CMS responded 502 for /api/redirects'))) }));

/** Route params as Next hands them over: each segment of the raw path decoded. */
const params = (path: string) => path.slice(1).split('/').map(decodeURIComponent);

describe('redirect lookup (D8)', () => {
  // The vectors of apps/cms/tests/url-fields.test.ts, stored as the CMS stores them.
  it('a request for a stored path finds it from the decoded route params', () => {
    for (const [typed, canonical] of vectors as [string, string][]) {
      if (canonical === '/') continue;
      let segments: string[];
      try {
        segments = params(canonical);
      } catch {
        continue; // A malformed escape is a 400 before any page runs.
      }
      expect(requestKey(segments), typed).toBe(storedKey(normalizeRedirectPath(typed)));
    }
  });

  it('an escaped and a plain reserved character are the same path; an escaped "/" is not', () => {
    expect(requestKey(params('/old:page'))).toBe(storedKey('/old%3Apage'));
    expect(requestKey(params('/old%3apage'))).toBe(storedKey('/old:page'));
    expect(requestKey(params('/a/b'))).not.toBe(storedKey('/a%2Fb'));
  });
});

// An unknown URL while the CMS is down: 404 (the not-found page), not a 500,
// and rendered per request so the miss is not cached.
it('without the redirect list an unknown path is an uncached 404', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(movedOrNotFound('trang-cu')).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  expect(connection).toHaveBeenCalled();
});
