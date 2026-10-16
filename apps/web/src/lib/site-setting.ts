import { connection } from 'next/server';
import { isBuildWithoutCms } from './build';
import { getSiteSetting } from './cms';
import type { SiteSetting } from './cms-types';

/**
 * Site-setting (contacts) for the layout and any page that shows them. If the
 * CMS fails, a page without hotline/Zalo must never be cached in place of a
 * good one: `connection()` throws during a static/ISR render, so Next keeps
 * serving the cached page (and a build marks the route dynamic instead of
 * baking it). Only a per-request render goes on without contacts. A build
 * without CMS_URL (BUILD_WITHOUT_CMS, CI) skips the request.
 */
export async function loadSiteSetting(): Promise<SiteSetting | null> {
  if (isBuildWithoutCms()) return null;
  try {
    return await getSiteSetting();
  } catch (error) {
    console.error('[site-setting] unavailable:', error instanceof Error ? error.message : error);
    await connection();
    return null;
  }
}
