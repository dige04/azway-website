import type { Core } from '@strapi/strapi';

// D4 / M3: tell the web app which cache tags changed. Tags are
// `<singularName>` and `<singularName>:<slug>` for every slug the document has
// (draft and published, so a renamed slug clears the old page too).
// Fire-and-forget: a failing webhook is logged and never blocks the editor.

const PUBLISH_ACTIONS = new Set(['publish', 'unpublish', 'delete']);
// Types without draft & publish go live on every write.
const WRITE_ACTIONS = new Set(['create', 'update', 'delete']);
// Never sent to the web: personal data, no web cache.
const EXCLUDED = new Set(['api::lead.lead']);

const slugsOf = async (strapi: Core.Strapi, uid: string, documentId: string): Promise<string[]> => {
  const attributes = (strapi.contentTypes as unknown as Record<string, { attributes: object }>)[uid].attributes;
  if (!('slug' in attributes)) return [];
  const rows = await strapi.db.query(uid as never).findMany({ where: { documentId }, select: ['slug'] });
  return [...new Set(rows.map((row: { slug?: string }) => row.slug).filter((slug): slug is string => Boolean(slug)))];
};

const send = async (strapi: Core.Strapi, tags: string[]) => {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    strapi.log.info(`[revalidate] ${tags.join(', ')}`);
  } catch (error) {
    strapi.log.error(`[revalidate] ${tags.join(', ')} failed: ${(error as Error).message}`);
  }
};

// Content-manager publish/unpublish run inside `strapi.db.transaction`; a
// webhook sent before the commit would let the web re-read the old data.
// A nested transaction shares the outer one's commit callbacks.
const sendAfterCommit = async (strapi: Core.Strapi, tags: string[]) => {
  if (!strapi.db.inTransaction()) return void send(strapi, tags);
  await strapi.db.transaction(async ({ onCommit }) => {
    onCommit(() => void send(strapi, tags));
  });
};

export const registerRevalidate = (strapi: Core.Strapi) => {
  strapi.documents.use(async (ctx, next) => {
    const contentType = strapi.contentTypes[ctx.uid as keyof typeof strapi.contentTypes];
    const actions = contentType?.options?.draftAndPublish ? PUBLISH_ACTIONS : WRITE_ACTIONS;
    if (!ctx.uid.startsWith('api::') || EXCLUDED.has(ctx.uid) || !actions.has(ctx.action)) return next();

    const short = contentType.info.singularName;
    const params = ctx.params as { documentId?: string };
    // Never fail an editor's action because of the webhook.
    const slugs = async (documentId: string | undefined) => {
      try {
        return documentId ? await slugsOf(strapi, ctx.uid, documentId) : [];
      } catch (error) {
        strapi.log.error(`[revalidate] reading slugs of ${ctx.uid} ${documentId} failed: ${(error as Error).message}`);
        return [];
      }
    };

    // Read before `next()`: after a delete the rows are gone.
    const before = await slugs(params.documentId);
    const result = await next();
    try {
      const after = await slugs(params.documentId ?? (result as { documentId?: string } | null)?.documentId);
      const tags = [short, ...[...new Set([...before, ...after])].map((slug) => `${short}:${slug}`)];
      await sendAfterCommit(strapi, tags);
    } catch (error) {
      strapi.log.error(`[revalidate] ${short} not sent: ${(error as Error).message}`);
    }
    return result;
  });
};
