import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { connection } from 'next/server';

/** True while `next build` runs without a CMS (CI, BUILD_WITHOUT_CMS=1): nothing to prerender from. */
export const isBuildWithoutCms = () => process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD && !process.env.CMS_URL;

/**
 * Call first in a CMS-backed page that is otherwise static/ISR (NFR-03, D4).
 * A build with CMS_URL prerenders the page as usual; a build without it marks
 * the page dynamic instead of failing or baking an empty page into the cache.
 */
export async function renderPerRequestWithoutCms(): Promise<void> {
  if (isBuildWithoutCms()) await connection();
}
