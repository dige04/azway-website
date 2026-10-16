import type { Core } from '@strapi/strapi';

// Read-only REST access for the web app (no API token on the web side).
// `lead` is deliberately absent: it has no routes at all.
const PUBLIC_COLLECTIONS = [
  'tour',
  'cruise',
  'teambuilding',
  'destination',
  'article',
  'article-category',
  'feedback',
  'redirect',
];
const PUBLIC_SINGLES = ['site-setting', 'homepage'];

const PUBLIC_ACTIONS = [
  ...PUBLIC_COLLECTIONS.flatMap((name) => [`api::${name}.${name}.find`, `api::${name}.${name}.findOne`]),
  ...PUBLIC_SINGLES.map((name) => `api::${name}.${name}.find`),
];

// `/api/upload/files?populate[related]=…` reads the database directly and
// returns draft documents linked to a file. Populating media on content types
// does not need these, so they are removed if present.
const FORBIDDEN_ACTIONS = ['plugin::upload.content-api.find', 'plugin::upload.content-api.findOne'];

// Public access is owned by this file, not by the admin UI: every boot grants
// missing PUBLIC_ACTIONS and removes FORBIDDEN_ACTIONS. Other Public
// permissions an administrator adds are left alone.
export const ensurePublicPermissions = async (strapi: Core.Strapi) => {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  if (!role) return;

  const permissions = strapi.db.query('plugin::users-permissions.permission');
  const granted = await permissions.findMany({ where: { role: role.id, action: { $in: PUBLIC_ACTIONS } } });
  const have = new Set(granted.map((permission: { action: string }) => permission.action));
  const missing = PUBLIC_ACTIONS.filter((action) => !have.has(action));

  for (const action of missing) await permissions.create({ data: { action, role: role.id } });
  if (missing.length) strapi.log.info(`[setup] granted Public: ${missing.join(', ')}`);

  const { count } = await permissions.deleteMany({ where: { role: role.id, action: { $in: FORBIDDEN_ACTIONS } } });
  if (count) strapi.log.warn(`[setup] removed ${count} Public upload permission(s): they expose drafts`);
};
