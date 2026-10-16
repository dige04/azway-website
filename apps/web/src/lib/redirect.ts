import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getRedirects } from './cms';
import { normalizeRedirectPath } from './redirect-path';

/**
 * The request path from route params in the CMS's canonical form. Next hands
 * params over decoded; encodeURI restores what the browser sent, except a
 * decoded "/", "?" or "#" inside a segment, which must stay escaped.
 */
export const pathFromParams = (segments: string[]): string =>
  normalizeRedirectPath(`/${segments.map((segment) => encodeURI(segment).replace(/[/?#]/g, encodeURIComponent)).join('/')}`);

/**
 * Legacy URLs (SEO-07, D8), for a path no page serves: redirect if the CMS
 * lists it, else 404. The list is one fetch cached under tag `redirect`, which
 * the CMS webhook clears on every redirect edit: an unknown path costs a cache
 * read, never a CMS request, and a new redirect works without a rebuild.
 * App Router sends 308/307, so the CMS's 301 (permanent) is a 308 and 302
 * (temporary) a 307.
 */
export async function movedOrNotFound(...segments: string[]): Promise<never> {
  const from = pathFromParams(segments);
  const rule = (await getRedirects()).find((entry) => entry.from === from);
  if (!rule) notFound();
  if (rule.statusCode === 302) redirect(rule.to);
  permanentRedirect(rule.to);
}
