// Sample data seed (WP-06): `pnpm --filter @azway/cms seed`. See README.md.
//
// Loads Strapi in-process (same database and .env as `develop`/`start`; no
// running server needed) and runs seed-lib.mjs against it.

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLocalTarget, seed } from './seed-lib.mjs';

// Strapi's ESM build imports lodash by name, which Node's ESM loader rejects.
const { compileStrapi, createStrapi } = createRequire(import.meta.url)('@strapi/strapi');

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');

// Check the target before Strapi touches it. Strapi would load .env itself;
// load it first (shell values still win) so the check sees the same values.
if (existsSync(path.join(appDir, '.env'))) process.loadEnvFile(path.join(appDir, '.env'));
try {
  assertLocalTarget(process.env);
} catch (error) {
  console.error(`[seed] ${error.message}`);
  process.exit(1);
}

const assetsDir = path.resolve(repoRoot, process.env.SEED_ASSETS_DIR || '../../assets');
const skipUnverified = process.env.SEED_SKIP_UNVERIFIED_MEDIA === '1';

const app = await createStrapi(await compileStrapi()).load();
let exitCode = 0;
try {
  console.log(`[seed] images from ${assetsDir}${skipUnverified ? ' (skipping unverified images)' : ''}`);
  const { summary, warnings } = await seed(app, { assetsDir, skipUnverified });
  for (const warning of warnings) console.warn(`[seed] warning: ${warning}`);
  console.table(summary);
  console.log('[seed] done: SAMPLE data, not real AZway content (see apps/cms/README.md)');
} catch (error) {
  console.error('[seed] failed:', error);
  exitCode = 1;
} finally {
  await app.destroy();
}
process.exit(exitCode);
