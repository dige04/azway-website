// AC-05 / FR-CMS-02: drafts never leave the CMS through the REST API.
// Strapi lets anyone with `find` ask `?status=draft`, and a client filter on
// `publishedAt` can replace the condition `status` adds (5.58 merges client
// `where` over its own lookup). So every read that is not from the admin panel
// or an API token is forced to `published`, and on draft & publish types the
// client filters are nested under `$and` next to `publishedAt $notNull`, where
// no client key can override it.
//
// Fail closed: a request is exempt only when positively identified as admin
// or API token. If Strapi renames those markers, the admin or preview loses
// drafts (visible at once) instead of the public gaining them.

export type RequestState = { route?: { info?: { type?: string } }; auth?: { strategy?: { name?: string } } };
type GuardStrapi = {
  requestContext: { get: () => { state?: unknown } | undefined };
  contentTypes: object;
};
type Schemas = Record<string, { options?: { draftAndPublish?: boolean } } | undefined>;
type GuardContext = { uid: string; action: string; params: unknown };

const READ_ACTIONS = new Set(['findMany', 'findOne', 'findFirst', 'count']);
export const PUBLISHED = { publishedAt: { $notNull: true } };

/** Requests that may read drafts; anything else in a request is treated as public. */
const mayReadDrafts = (state: RequestState) =>
  state.route?.info?.type === 'admin' || state.auth?.strategy?.name === 'content-api-token';

export const publishedOnly =
  (strapi: GuardStrapi) =>
  <T>(ctx: GuardContext, next: () => T): T => {
    if (!READ_ACTIONS.has(ctx.action)) return next();
    const request = strapi.requestContext.get();
    // No request: bootstrap, cron, background jobs. Not exposed to anyone.
    if (!request) return next();
    if (mayReadDrafts((request.state ?? {}) as RequestState)) return next();

    const params = ctx.params as { status?: string; filters?: unknown };
    params.status = 'published';
    if ((strapi.contentTypes as Schemas)[ctx.uid]?.options?.draftAndPublish) {
      params.filters = params.filters ? { $and: [PUBLISHED, params.filters] } : PUBLISHED;
    }
    return next();
  };
