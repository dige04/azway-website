// The seed's promises (README) against a real Strapi on a temporary sqlite:
// a second run creates nothing and changes no counts, the draft tour stays off
// the public API, and a non-local target is refused.
import { randomBytes } from 'node:crypto';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertLocalTarget, seed } from '../scripts/seed-lib.mjs';

// Strapi is CommonJS; loading it through Vite's ESM interop fails.
const { compileStrapi, createStrapi } = createRequire(__filename)('@strapi/strapi') as typeof import('@strapi/strapi');

const dbFile = `.tmp/test-seed-${process.pid}.db`;
// Only the logo (in the repo); every other image is reported missing.
const assetsDir = mkdtempSync(path.join(tmpdir(), 'seed-assets-'));
copyFileSync(path.join(__dirname, '../../../design/assets/logo-azway.png'), path.join(assetsDir, 'logo-azway.png'));

let strapi: Core.Strapi;
let base: string;
let first: Awaited<ReturnType<typeof seed>>;

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
    // Never the real bucket, whatever apps/cms/.env says (dotenv keeps these).
    R2_ACCOUNT_ID: '',
    R2_ACCESS_KEY_ID: '',
    R2_SECRET_ACCESS_KEY: '',
    R2_BUCKET: '',
    R2_PUBLIC_URL: '',
  });
  assertLocalTarget(process.env);
  strapi = await createStrapi(await compileStrapi()).load();
  await strapi.listen();
  base = `http://127.0.0.1:${(strapi.server.httpServer.address() as { port: number }).port}`;
  first = await seed(strapi, { assetsDir });
}, 240_000);

afterAll(async () => {
  // Remove the uploaded logo (and its resized formats) from public/uploads.
  const files = (await strapi?.db.query('plugin::upload.file').findMany()) ?? [];
  for (const file of files) {
    for (const url of [file.url, ...Object.values(file.formats ?? {}).map((format: any) => format.url)]) {
      rmSync(path.join(strapi.dirs.static.public, url), { force: true });
    }
  }
  // Not strapi.destroy(): it calls process.removeAllListeners(), which kills the vitest worker.
  await strapi?.server.destroy();
  await strapi?.db.destroy();
  rmSync(path.join(__dirname, '..', dbFile), { force: true });
  rmSync(assetsDir, { recursive: true, force: true });
});

describe('seed', () => {
  it('a second run creates nothing, changes no count and keeps the single types', async () => {
    const counts = async () =>
      Object.fromEntries(await Promise.all(Object.keys(first.summary).map(async (uid) => [uid, await strapi.db.query(uid as any).count()])));
    const before = await counts();
    // A value an editor set after the first run: a rerun must not reset it.
    const settings = strapi.documents('api::site-setting.site-setting');
    const setting = await settings.findFirst();
    await settings.update({ documentId: setting!.documentId, data: { leadNotifyEmails: 'sentinel@azway.test' } });

    const second = await seed(strapi, { assetsDir });
    console.table(second.summary);
    expect(Object.values(first.summary).some((row) => row.created > 0)).toBe(true);
    for (const [uid, row] of Object.entries(second.summary)) expect(row.created, uid).toBe(0);
    expect(await counts()).toEqual(before);
    expect(second.summary['api::site-setting.site-setting']).toMatchObject({ kept: 1, updated: 0 });
    expect((await settings.findFirst())?.leadNotifyEmails).toBe('sentinel@azway.test');
  }, 180_000);

  it('keeps the draft tour off the public API', async () => {
    const draft = await strapi.documents('api::tour.tour').findFirst({ filters: { code: 'JP-6N5D' }, status: 'draft' });
    expect(draft?.publishedAt).toBeNull();
    const response = await fetch(`${base}/api/tours?filters[code][$eq]=JP-6N5D`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [] });
  });

  it('refuses a target that may hold real data unless SEED_ALLOW_REMOTE=1', () => {
    expect(() => assertLocalTarget({ DATABASE_CLIENT: 'sqlite', R2_BUCKET: '' })).not.toThrow();
    for (const env of [{ NODE_ENV: 'production' }, { DATABASE_CLIENT: 'postgres' }, { R2_BUCKET: 'media' }]) {
      expect(() => assertLocalTarget(env), JSON.stringify(env)).toThrow('refusing to seed');
      expect(() => assertLocalTarget({ ...env, SEED_ALLOW_REMOTE: '1' })).not.toThrow();
    }
  });
});
