import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getRedirects } from './cms';

/**
 * One form for both sides of the lookup: every segment decoded, then encoded
 * with encodeURIComponent. Next hands params over decoded, so "%3A" and ":"
 * can no longer be told apart and must compare equal; a "/" decoded from
 * "%2F" stays inside its segment, and "%25" stays a literal "%".
 */
const keyOf = (segments: string[]): string => segments.map(encodeURIComponent).join('/');

const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    // A stray "%" stored as typed: it can only mean a literal "%".
    return segment;
  }
};

/** Key of a stored `redirect.from` (canonical form, apps/cms/src/utils/redirect-path.ts). */
export const storedKey = (from: string): string => keyOf(from.slice(1).split('/').map(decodeSegment));

/** Key of a request from its route params, which Next has decoded segment by segment. */
export const requestKey = keyOf;

/**
 * Legacy URLs (SEO-07, D8), for a path no page serves: redirect if the CMS
 * lists it, else 404. The list is one fetch cached under tag `redirect`, which
 * the CMS webhook clears on every redirect edit: an unknown path costs a cache
 * read, never a CMS request, and a new redirect works without a rebuild.
 * App Router sends 308/307, so the CMS's 301 (permanent) is a 308 and 302
 * (temporary) a 307.
 */
export async function movedOrNotFound(...segments: string[]): Promise<never> {
  let rules;
  try {
    rules = await getRedirects();
  } catch (error) {
    // CMS down: a 404 rather than a 500 on every unknown URL, rendered per
    // request so the miss is not cached.
    console.error(`[redirect] list unavailable, answering 404: ${(error as Error).message}`);
    await connection();
    notFound();
  }
  const key = requestKey(segments);
  const rule = rules.find((entry) => storedKey(entry.from) === key);
  if (!rule) notFound();
  if (rule.statusCode === 302) redirect(rule.to);
  permanentRedirect(rule.to);
}
