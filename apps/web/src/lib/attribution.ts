// First-visit attribution (FR-LEAD-07): written by AttributionCookies on
// every page, read by /api/lead. No zod here: this ships with every page.
export const LANDING_COOKIE = 'az_landing';
export const UTM_COOKIE = 'az_utm';
export const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60;
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;
