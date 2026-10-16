import { describe, expect, it } from 'vitest';
import { PUBLISHED, publishedOnly, type RequestState } from '../src/setup/published-only';

const strapiWith = (state: RequestState | undefined) => ({
  requestContext: { get: () => (state ? { state } : undefined) },
  contentTypes: { 'api::tour.tour': { options: { draftAndPublish: true } }, 'api::redirect.redirect': {} },
});
const run = (state: RequestState | undefined, params: Record<string, unknown>, uid = 'api::tour.tour', action = 'findMany') => {
  publishedOnly(strapiWith(state))({ uid, action, params }, () => undefined);
  return params;
};

const publicRequest: RequestState = { route: { info: { type: 'content-api' } } };
const clientFilters = { $or: [{ publishedAt: { $null: true } }, { code: 'x' }] };

describe('publishedOnly', () => {
  it('forces public reads to published; client filters cannot override it', () => {
    expect(run(publicRequest, { status: 'draft', filters: clientFilters })).toEqual({
      status: 'published',
      filters: { $and: [PUBLISHED, clientFilters] },
    });
    expect(run(publicRequest, {})).toEqual({ status: 'published', filters: PUBLISHED });
    // Unknown route markers (e.g. renamed by a Strapi upgrade) count as public.
    expect(run({}, { status: 'draft' })).toEqual({ status: 'published', filters: PUBLISHED });
    // No `publishedAt` on types without draft & publish.
    expect(run(publicRequest, { filters: { from: '/a' } }, 'api::redirect.redirect')).toEqual({
      status: 'published',
      filters: { from: '/a' },
    });
  });

  it('leaves admin, API-token, internal and write calls alone', () => {
    const draft = () => ({ status: 'draft', filters: { code: 'x' } });
    expect(run({ route: { info: { type: 'admin' } } }, draft())).toEqual(draft());
    expect(run({ ...publicRequest, auth: { strategy: { name: 'content-api-token' } } }, draft())).toEqual(draft());
    expect(run(undefined, draft())).toEqual(draft());
    expect(run(publicRequest, draft(), 'api::tour.tour', 'update')).toEqual(draft());
  });
});
