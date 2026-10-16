import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const r2PublicUrl = env('R2_PUBLIC_URL', '');
  const mediaSources = r2PublicUrl ? [new URL(r2PublicUrl).origin] : [];
  const corsOrigins = env.array('CORS_ORIGINS', []).filter(Boolean);

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...mediaSources],
            'media-src': ["'self'", 'data:', 'blob:', 'market-assets.strapi.io', ...mediaSources],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        // The web app reads the CMS server-side; browsers only need CORS for
        // origins listed here. Default to the local Next.js dev server.
        origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:3000'],
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
