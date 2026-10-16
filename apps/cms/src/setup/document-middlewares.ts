import type { Core } from '@strapi/strapi';
import { readingMinutes } from '../utils/reading-time';
import { normalizeRedirectPath } from '../utils/redirect-path';

type Data = Record<string, unknown>;

const READ_ACTIONS = new Set(['findMany', 'findOne', 'findFirst', 'count']);

type RequestState = { route?: { info?: { type?: string } }; auth?: { strategy?: { name?: string } } };

export const registerDocumentMiddlewares = (strapi: Core.Strapi) => {
  // AC-05 / FR-CMS-02: Strapi's REST API returns drafts to anyone with `find`
  // when asked `?status=draft`. Public and users-permissions callers always
  // get published content; only API tokens (future preview, FR-CMS-09) may
  // read drafts. The admin panel does not go through the content API.
  strapi.documents.use(async (ctx, next) => {
    if (!READ_ACTIONS.has(ctx.action)) return next();
    const state = strapi.requestContext.get()?.state as RequestState | undefined;
    if (state?.route?.info?.type === 'content-api' && state.auth?.strategy?.name !== 'content-api-token') {
      (ctx.params as { status?: string }).status = 'published';
    }
    return next();
  });

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
