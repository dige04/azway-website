import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  // Behind a TLS-terminating proxy: trust X-Forwarded-* so the admin cookie
  // gets Secure and the admin login rate limit sees the client, not the proxy.
  // Strapi reads server.proxy.koa; a bare `proxy: true` is ignored.
  proxy: { koa: env.bool('SERVER_PROXY', false) },
  app: {
    keys: env.array('APP_KEYS')!,
  },
  cron: {
    enabled: env.bool('CRON_ENABLED', true),
    tasks: cronTasks,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
