import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  // NFR-07: admin panel behind a custom path. Baked into the admin bundle,
  // so ADMIN_PATH must be set when running `strapi build`, not only at start.
  url: env('ADMIN_PATH', '/admin'),
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  // NFR-07: throttle /admin/login and /admin/register-admin per email + path + IP.
  // These are Strapi's defaults, kept explicit. Behind a proxy the IP is only
  // right with SERVER_PROXY=true (config/server.ts).
  rateLimit: {
    enabled: true,
    interval: 5 * 60 * 1000, // ms
    max: 5,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  flags: {
    nps: env.bool('FLAG_NPS', false),
    promoteEE: env.bool('FLAG_PROMOTE_EE', false),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
});

export default config;
