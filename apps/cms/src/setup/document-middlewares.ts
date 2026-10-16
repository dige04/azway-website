import type { Core } from '@strapi/strapi';
import { readingMinutes } from '../utils/reading-time';
import { normalizeRedirectPath } from '../utils/redirect-path';
import { publishedOnly } from './published-only';

type Data = Record<string, unknown>;

export const registerDocumentMiddlewares = (strapi: Core.Strapi) => {
  strapi.documents.use(publishedOnly(strapi));

  strapi.documents.use(async (ctx, next) => {
    if (ctx.action !== 'create' && ctx.action !== 'update') return next();
    const data = (ctx.params as { data?: Data }).data;
    if (!data) return next();

    if (ctx.uid === 'api::article.article') {
      // Always derived: ignore any value the client sent. An update without
      // `content` keeps the stored value.
      if (ctx.action === 'create' || 'content' in data) data.readingMinutes = readingMinutes(data.content);
      else delete data.readingMinutes;
    }

    if (ctx.uid === 'api::redirect.redirect' && typeof data.from === 'string') {
      data.from = normalizeRedirectPath(data.from);
    }

    return next();
  });
};
