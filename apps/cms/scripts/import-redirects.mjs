// Legacy URL list (SEO-07): `pnpm --filter @azway/cms import-redirects <file.csv>`.
// CSV `from,to,statusCode` (see scripts/redirects.sample.csv). Upserts by the
// old URL, so running it again changes nothing. Loads Strapi in-process
// (same database and .env as `start`), writes through the redirect service,
// then tells the web (WEB_REVALIDATE_URL) and prints whether that worked.

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Strapi's ESM build imports lodash by name, which Node's ESM loader rejects.
const { compileStrapi, createStrapi } = createRequire(import.meta.url)('@strapi/strapi');

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('usage: pnpm --filter @azway/cms import-redirects <file.csv>');
  process.exit(1);
}
const text = readFileSync(file, 'utf8');

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(appDir, '.env'))) process.loadEnvFile(path.join(appDir, '.env'));

const app = await createStrapi(await compileStrapi()).load();
let exitCode = 0;
try {
  const { errors, summary, revalidate } = await app.service('api::redirect.redirect').importCsv(text);
  if (errors) {
    for (const error of errors) console.error(`[import-redirects] ${error}`);
    console.error('[import-redirects] nothing imported');
    exitCode = 1;
  } else {
    console.table(summary);
    console.log(`[import-redirects] web cache: ${revalidate}`);
    if (revalidate !== 'sent') console.warn('[import-redirects] saved, but the web may show the old list for up to an hour');
  }
} catch (error) {
  console.error('[import-redirects] failed:', error);
  exitCode = 1;
} finally {
  await app.destroy();
}
process.exit(exitCode);
