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

export const registerRevalidate = (strapi: Core.Strapi) => {
  strapi.documents.use(async (ctx, next) => {
    const contentType = strapi.contentTypes[ctx.uid as keyof typeof strapi.contentTypes];
    const actions = contentType?.options?.draftAndPublish ? PUBLISH_ACTIONS : WRITE_ACTIONS;
    if (!ctx.uid.startsWith('api::') || EXCLUDED.has(ctx.uid) || !actions.has(ctx.action)) return next();

    const params = ctx.params as { documentId?: string };
    // Read before `next()`: after a delete the rows are gone.
    const before = params.documentId ? await slugsOf(strapi, ctx.uid, params.documentId) : [];
    const result = await next();
    const documentId = params.documentId ?? (result as { documentId?: string } | null)?.documentId;
    const after = documentId ? await slugsOf(strapi, ctx.uid, documentId) : [];

    const short = contentType.info.singularName;
    const tags = [short, ...[...new Set([...before, ...after])].map((slug) => `${short}:${slug}`)];
    void send(strapi, tags);
    return result;
  });
};
