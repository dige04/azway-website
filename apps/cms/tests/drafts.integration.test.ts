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
let secretTourId: string;
let publicTourId: string;
let apiToken: string;
let adminToken: string;

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
  const secretTour = await tours.create({
    data: { name: 'SECRET tour', code: 'SECRET', slug: 'secret', category: 'noi_dia', durationDays: 1, durationNights: 0 },
  });
  secretTourId = secretTour.documentId;
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
  publicTourId = published.documentId;

  // Readers that must keep seeing drafts (FR-CMS-09 preview, the admin panel).
  const token = await strapi
    .service('admin::api-token')
    .create({ name: 'preview', type: 'read-only', kind: 'content-api', lifespan: null });
  apiToken = token.accessKey;
  const password = `${randomBytes(18).toString('base64url')}Aa1!`;
  const superAdmin = await strapi.service('admin::role').getSuperAdmin();
  await strapi
    .service('admin::user')
    .create({ firstname: 'Test', email: 'admin@test.local', password, isActive: true, roles: [superAdmin.id] });
  const login = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password }),
  });
  adminToken = ((await login.json()) as { data: { token: string } }).data.token;
}, 120_000);

afterAll(async () => {
  // Not strapi.destroy(): it calls process.removeAllListeners(), which kills the vitest worker.
  await strapi?.server.destroy();
  await strapi?.db.destroy();
  rmSync(path.join(__dirname, '..', dbFile), { force: true });
});

const get = async (query: string, token?: string) => {
  const response = await fetch(base + query, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: await response.text() };
};

const EMPTY = '"data":[]';

describe('public REST API (AC-05)', () => {
  // [query, expected status, what the answer must contain]
  it.each([
    ['/api/tours', 200, ['Public tour']],
    ['/api/tours?status=draft', 200, ['Public tour']],
    ['/api/tours?filters[publishedAt][$null]=true', 200, [EMPTY]],
    ['/api/tours?status=draft&filters[$or][0][publishedAt][$null]=true&filters[$or][1][code]=SECRET', 200, [EMPTY]],
    ['/api/tours?status=draft&populate[articles]=true', 200, ['Public tour']],
    // Images still populate without Public upload permissions.
    ['/api/tours?populate[thumbnail]=true', 200, ['Public tour', '/uploads/a.png']],
    ['/api/articles?status=draft', 200, [EMPTY]],
    // Rejected on purpose: `related` is private (src/extensions/upload).
    ['/api/tours?populate[thumbnail][populate][related]=true', 400, []],
    // No Public upload permissions.
    ['/api/upload/files?populate[related]=true', 403, []],
  ] as const)('%s returns no draft', async (query, status, expected) => {
    const response = await get(query);
    expect(response.body).not.toContain('SECRET');
    expect(response.status).toBe(status);
    for (const text of expected) expect(response.body).toContain(text);
  });

  it('findOne returns the published document and not the draft-only one', async () => {
    expect(publicTourId).toBeTruthy();
    expect(secretTourId).toBeTruthy();
    expect(await get(`/api/tours/${publicTourId}?status=draft`)).toMatchObject({ status: 200, body: expect.stringContaining('Public tour') });
    const draft = await get(`/api/tours/${secretTourId}?status=draft`);
    expect(draft.status).toBe(404);
    expect(draft.body).not.toContain('SECRET');
  });
});

describe('trusted readers still see drafts', () => {
  it('API token (FR-CMS-09 preview) and the admin panel', async () => {
    expect((await get('/api/tours?status=draft', apiToken)).body).toContain('SECRET tour');
    expect((await get('/content-manager/collection-types/api::tour.tour', adminToken)).body).toContain('SECRET tour');
  });
});
