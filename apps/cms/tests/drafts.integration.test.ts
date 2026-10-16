// AC-05 against a real Strapi (temporary sqlite): the public REST API must
// never return drafts, whatever the query says. Guards against Strapi
// upgrades silently disabling src/setup/published-only.ts.
import { randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Strapi is CommonJS; loading it through Vite's ESM interop fails.
const { compileStrapi, createStrapi } = createRequire(__filename)('@strapi/strapi') as typeof import('@strapi/strapi');

const dbFile = `.tmp/test-drafts-${process.pid}.db`;
let strapi: Core.Strapi;
let base: string;

beforeAll(async () => {
  const secret = () => randomBytes(16).toString('base64');
  Object.assign(process.env, {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '0',
    APP_KEYS: `${secret()},${secret()}`,
    API_TOKEN_SALT: secret(),
    ADMIN_JWT_SECRET: secret(),
    TRANSFER_TOKEN_SALT: secret(),
    JWT_SECRET: secret(),
    ENCRYPTION_KEY: secret(),
    DATABASE_CLIENT: 'sqlite',
    DATABASE_FILENAME: dbFile,
    CRON_ENABLED: 'false',
  });
  strapi = await createStrapi(await compileStrapi()).load();
  await strapi.listen();
  const address = strapi.server.httpServer.address() as { port: number };
  base = `http://127.0.0.1:${address.port}`;

  const tours = strapi.documents('api::tour.tour');
  // A media file used by a draft: /api/upload/files?populate[related] must not reveal it.
  const cover = await strapi.db.query('plugin::upload.file').create({
    data: { name: 'a.png', hash: 'a', ext: '.png', mime: 'image/png', size: 1, url: '/uploads/a.png', provider: 'local' },
  });
  const article = await strapi
    .documents('api::article.article')
    .create({ data: { title: 'SECRET article', slug: 'secret-article', content: [], cover: cover.id } });
  await tours.create({ data: { name: 'SECRET tour', code: 'SECRET', slug: 'secret', category: 'noi_dia', durationDays: 1, durationNights: 0 } });
  const published = await tours.create({
    data: {
      name: 'Public tour',
      code: 'PUB',
      slug: 'public',
      category: 'noi_dia',
      durationDays: 1,
      durationNights: 0,
      thumbnail: cover.id,
      articles: { connect: [article.documentId] },
    },
  });
  await tours.publish({ documentId: published.documentId });
}, 120_000);

afterAll(async () => {
  // Not strapi.destroy(): it calls process.removeAllListeners(), which kills the vitest worker.
  await strapi?.server.destroy();
  await strapi?.db.destroy();
  rmSync(path.join(__dirname, '..', dbFile), { force: true });
});

describe('public REST API (AC-05)', () => {
  // [query, published tour expected in the answer]
  it.each([
    ['/api/tours', true],
    ['/api/tours?status=draft', true],
    ['/api/tours?filters[publishedAt][$null]=true', false],
    ['/api/tours?status=draft&filters[$or][0][publishedAt][$null]=true&filters[$or][1][code]=SECRET', false],
    ['/api/tours?status=draft&populate[articles]=true', true],
    ['/api/articles?status=draft', false],
    ['/api/tours?populate[thumbnail][populate][related]=true', false],
    ['/api/upload/files?populate[related]=true', false],
  ])('%s returns no draft', async (query, expectPublished) => {
    const body = await (await fetch(base + query)).text();
    expect(body).not.toContain('SECRET');
    if (expectPublished) expect(body).toContain('Public tour');
  });
});
