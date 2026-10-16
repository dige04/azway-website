import path from 'path';
import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'postgres') {
    return {
      connection: {
        client: 'postgres',
        connection: {
          // DATABASE_URL wins over the discrete fields when set.
          connectionString: env('DATABASE_URL'),
          host: env('DATABASE_HOST', 'localhost'),
          port: env.int('DATABASE_PORT', 5432),
          database: env('DATABASE_NAME', 'strapi'),
          user: env('DATABASE_USERNAME', 'strapi'),
          password: env('DATABASE_PASSWORD', 'strapi'),
          ssl: env.bool('DATABASE_SSL', false) && {
            rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
          },
          schema: env('DATABASE_SCHEMA', 'public'),
        },
        pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
        acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
      },
    };
  }

  if (client !== 'sqlite') {
    throw new Error(`Unsupported DATABASE_CLIENT: ${client}. Use "sqlite" or "postgres".`);
  }

  return {
    connection: {
      client: 'sqlite',
      connection: {
        // Compiled config lives in dist/config, hence two levels up to apps/cms.
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };
};

export default config;
