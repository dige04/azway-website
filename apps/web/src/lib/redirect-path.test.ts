import { describe, expect, it } from 'vitest';
import vectors from '../../../cms/tests/redirect-paths.json';
import { pathFromParams } from './redirect';
import { normalizeRedirectPath } from './redirect-path';

describe('redirect paths (D8)', () => {
  // The same vectors as apps/cms/tests/url-fields.test.ts, which stores redirect.from.
  it('the web normalises exactly like the CMS', () => {
    for (const [typed, canonical] of vectors as [string, string][]) {
      expect(normalizeRedirectPath(typed), typed).toBe(canonical);
    }
  });

  // Next decodes each param with decodeURIComponent (a malformed escape is a
  // 400 before any page runs); the lookup must get the stored form back.
  it('a request for a stored path finds it from the decoded route params', () => {
    for (const [, canonical] of vectors as [string, string][]) {
      if (canonical === '/') continue;
      let segments: string[];
      try {
        segments = canonical.slice(1).split('/').map(decodeURIComponent);
      } catch {
        continue;
      }
      expect(pathFromParams(segments), canonical).toBe(canonical);
    }
  });
});
