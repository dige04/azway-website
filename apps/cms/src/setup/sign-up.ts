import type { Core } from '@strapi/strapi';

const STORE_KEY = 'azway_sign_up_closed';

// The site has no end-user accounts, so POST /api/auth/local/register must
// not create any. Strapi opens it by default; it is closed once, so an
// administrator can reopen it later (Settings → Users & Permissions → Advanced).
export const closePublicSignUp = async (strapi: Core.Strapi) => {
  const marker = { type: 'core' as const, key: STORE_KEY };
  if (await strapi.store.get(marker)) return;

  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>;
  await store.set({ key: 'advanced', value: { ...advanced, allow_register: false } });

  await strapi.store.set({ ...marker, value: true });
  strapi.log.info('[setup] public sign-up (/api/auth/local/register) disabled');
};
