import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  // Behind a TLS-terminating proxy: trust X-Forwarded-* so the admin cookie
  // gets Secure and the admin login rate limit sees the client, not the proxy.
  // Strapi reads server.proxy.koa; a bare `proxy: true` is ignored.
  proxy: {
    koa: env.bool('SERVER_PROXY', false),
    // Header with the client IP. Render: True-Client-IP, which its Cloudflare
    // edge overwrites; X-Forwarded-For there keeps what the client sent.
    ipHeader: env('SERVER_PROXY_IP_HEADER', 'X-Forwarded-For'),
    // Only the last entry, written by the nearest proxy, never what a client
    // put in front. Behind more hops than that the throttle gets stricter
    // (shared IP), never bypassable.
    maxIpsCount: 1,
  },
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
