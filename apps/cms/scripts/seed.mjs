// Sample data seed (WP-06): `pnpm --filter @azway/cms seed`. See README.md.
//
// Loads Strapi in-process (same database as `develop`/`start`) and writes
// through the Document Service. Idempotent: entries are matched by slug/code
// (feedback by groupName, redirects by `from`) and updated in place; images are
// matched by file name and uploaded once.

import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import guide from './seed-data/guide.json' with { type: 'json' };
import { media } from './seed-data/media.mjs';
import { tours } from './seed-data/tours.mjs';
import {
  articleLinks,
  cruises,
  destinations,
  feedbacks,
  homepage,
  redirects,
  siteSetting,
  teambuildings,
} from './seed-data/catalog.mjs';

// Strapi's ESM build imports lodash by name, which Node's ESM loader rejects.
const { compileStrapi, createStrapi } = createRequire(import.meta.url)('@strapi/strapi');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const assetsDir = path.resolve(repoRoot, process.env.SEED_ASSETS_DIR || '../../assets');
const skipUnverified = process.env.SEED_SKIP_UNVERIFIED_MEDIA === '1';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// Blocks (rich text) builders.
const text = (value) => ({ type: 'text', text: value });
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] });
const heading = (value, level = 2) => ({ type: 'heading', level, children: [text(value)] });
const list = (entries) => ({
  type: 'list',
  format: 'unordered',
  children: entries.map((entry) => ({ type: 'list-item', children: [entry.url ? { type: 'link', url: entry.url, children: [text(entry.label)] } : text(entry)] })),
});
const items = (texts) => texts.map((value) => ({ text: value }));

function articleBlocks(article) {
  return [
    ...article.sections.flatMap((section) => [
      heading(section.title),
      ...section.paragraphs.map(paragraph),
      ...(section.bullets ? [list(section.bullets)] : []),
    ]),
    ...(article.checklist ? [heading('Checklist nhanh', 3), list(article.checklist)] : []),
    ...(article.takeaway ? [{ type: 'quote', children: [text(article.takeaway)] }] : []),
    ...(article.sources ? [heading('Nguồn tham khảo'), list(article.sources)] : []),
  ];
}

async function seed(strapi) {
  const summary = {};
  const warnings = [];
  const count = (uid, action) => {
    summary[uid] ??= { created: 0, updated: 0 };
    summary[uid][action] += 1;
  };

  // Media: key -> upload file id, or null when skipped/missing.
  const mediaIds = new Map();
  async function mediaId(key) {
    if (!key) return null;
    if (mediaIds.has(key)) return mediaIds.get(key);
    const entry = media[key];
    if (!entry) throw new Error(`Unknown media key "${key}"`);
    let id = null;
    const file = path.join(assetsDir, entry.file);
    if (!entry.verified && skipUnverified) {
      // Intentional: SEED_SKIP_UNVERIFIED_MEDIA=1.
    } else if (!existsSync(file)) {
      warnings.push(`image missing, skipped: ${file}`);
    } else {
      const name = path.basename(file);
      const fileInfo = { name, alternativeText: entry.alt, caption: entry.caption };
      const files = strapi.db.query('plugin::upload.file');
      const existing = await files.findOne({ where: { name } });
      if (existing) {
        if (existing.alternativeText !== entry.alt || existing.caption !== entry.caption) {
          await files.update({ where: { id: existing.id }, data: { alternativeText: entry.alt, caption: entry.caption } });
        }
        id = existing.id;
        count('plugin::upload.file', 'updated');
      } else {
        const [uploaded] = await strapi.plugin('upload').service('upload').upload({
          data: { fileInfo },
          files: { filepath: file, originalFilename: name, mimetype: MIME[path.extname(name).toLowerCase()], size: statSync(file).size },
        });
        id = uploaded.id;
        count('plugin::upload.file', 'created');
      }
    }
    mediaIds.set(key, id);
    return id;
  }
  const mediaList = async (keys = []) => (await Promise.all(keys.map(mediaId))).filter((id) => id !== null);
  const firstMedia = async (keys) => (await mediaList(keys))[0] ?? null;

  // Upsert one document matched by `where` ({ slug: ... }); returns documentId.
  async function upsert(uid, where, data, { draft = false } = {}) {
    const documents = strapi.documents(uid);
    const hasDraft = strapi.contentType(uid).options?.draftAndPublish !== false;
    const existing = await documents.findFirst({ filters: where, ...(hasDraft && { status: 'draft' }) });
    const doc = existing
      ? await documents.update({ documentId: existing.documentId, data })
      : await documents.create({ data });
    count(uid, existing ? 'updated' : 'created');
    if (hasDraft && !draft) await documents.publish({ documentId: doc.documentId });
    if (hasDraft && draft) await documents.unpublish({ documentId: doc.documentId });
    return doc.documentId;
  }
  // Single types have no key: the one document is the match.
  async function upsertSingle(uid, data) {
    const documents = strapi.documents(uid);
    const hasDraft = strapi.contentType(uid).options?.draftAndPublish !== false;
    const existing = await documents.findFirst(hasDraft ? { status: 'draft' } : {});
    const doc = existing
      ? await documents.update({ documentId: existing.documentId, data })
      : await documents.create({ data });
    if (hasDraft) await documents.publish({ documentId: doc.documentId });
    count(uid, existing ? 'updated' : 'created');
  }

  const ids = { destination: {}, tour: {}, cruise: {}, article: {}, category: {} };
  const refs = (map, slugs = []) => slugs.map((slug) => {
    if (!map[slug]) throw new Error(`Unknown reference "${slug}"`);
    return map[slug];
  });

  for (const { about, image, ...destination } of destinations) {
    ids.destination[destination.slug] = await upsert('api::destination.destination', { slug: destination.slug }, {
      ...destination,
      image: await mediaId(image),
      description: [paragraph(about)],
    });
  }

  for (const { draft, metaDescription, thumbnail, gallery, destinations: places, ...tour } of tours) {
    ids.tour[tour.slug] = await upsert('api::tour.tour', { code: tour.code }, {
      ...tour,
      thumbnail: await mediaId(thumbnail),
      gallery: await mediaList(gallery),
      destinations: refs(ids.destination, places),
      seo: { metaTitle: tour.name, metaDescription: metaDescription ?? null },
    }, { draft });
  }

  for (const { about, ...cruise } of cruises) {
    ids.cruise[cruise.slug] = await upsert('api::cruise.cruise', { slug: cruise.slug }, {
      ...cruise,
      description: [paragraph(about)],
      destinations: refs(ids.destination, ['ha-long']),
    });
  }

  for (const { about, packages, games, thumbnail, album, tours: linked, ...teambuilding } of teambuildings) {
    await upsert('api::teambuilding.teambuilding', { slug: teambuilding.slug }, {
      ...teambuilding,
      description: [paragraph(about)],
      packages: items(packages),
      games: await Promise.all(games.map(async ({ image, ...game }) => ({ ...game, image: await mediaId(image) }))),
      thumbnail: await mediaId(thumbnail),
      album: await mediaList(album),
      tours: refs(ids.tour, linked),
    });
  }

  for (const category of guide.categories) {
    ids.category[category.slug] = await upsert('api::article-category.article-category', { slug: category.slug }, category);
  }

  for (const article of guide.articles) {
    const links = articleLinks[article.slug] ?? {};
    ids.article[article.slug] = await upsert('api::article.article', { slug: article.slug }, {
      title: article.title,
      slug: article.slug,
      category: ids.category[article.category],
      author: 'AZway',
      excerpt: article.excerpt,
      content: articleBlocks(article),
      cover: await mediaId(links.cover),
      tours: refs(ids.tour, links.tours),
      cruises: refs(ids.cruise, links.cruises),
    });
  }

  for (const { tour, ...feedback } of feedbacks) {
    await upsert('api::feedback.feedback', { groupName: feedback.groupName }, {
      ...feedback,
      tour: tour ? refs(ids.tour, [tour])[0] : null,
    });
  }

  const { shareImage, ...defaultSeo } = siteSetting.defaultSeo;
  await upsertSingle('api::site-setting.site-setting', {
    ...siteSetting,
    defaultSeo: { ...defaultSeo, shareImage: await mediaId(shareImage) },
  });

  const heroSlides = [];
  for (const { image, ...slide } of homepage.heroSlides) {
    const id = await firstMedia(image);
    if (id === null) warnings.push(`hero slide "${slide.title}" skipped: no image available`);
    else heroSlides.push({ ...slide, image: id });
  }
  await upsertSingle('api::homepage.homepage', {
    heroSlides,
    featuredTours: refs(ids.tour, homepage.featuredTours),
    featuredCruises: refs(ids.cruise, homepage.featuredCruises),
    featuredArticles: refs(ids.article, homepage.featuredArticles),
  });

  for (const redirect of redirects) await upsert('api::redirect.redirect', { from: redirect.from }, redirect);

  return { summary, warnings };
}

const app = await createStrapi(await compileStrapi()).load();
let exitCode = 0;
try {
  console.log(`[seed] images from ${assetsDir}${skipUnverified ? ' (skipping unverified images)' : ''}`);
  const { summary, warnings } = await seed(app);
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
