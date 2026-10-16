import { factories } from '@strapi/strapi';
import { normalizeRedirectPath } from '../../../utils/redirect-path';
import { revalidateWeb } from '../../../setup/revalidate';
import { parseRedirectCsv } from '../../../utils/redirect-csv';

export default factories.createCoreService('api::redirect.redirect', ({ strapi }) => ({
  /**
   * scripts/import-redirects.mjs: one redirect per canonical `from`, so the
   * same list imported again changes nothing and a changed target updates.
   * A file with any bad line imports nothing. Resolves once the web has been
   * told (tag `redirect`): the per-write webhooks are not awaited, and the
   * script exits right after.
   */
  async importCsv(text: string) {
    const { rows, errors } = parseRedirectCsv(text);
    if (errors.length > 0) return { errors };
    const documents = strapi.documents('api::redirect.redirect');
    const summary = { created: 0, updated: 0, kept: 0 };
    for (const { from: typed, to, statusCode } of rows) {
      const from = normalizeRedirectPath(typed);
      const existing = await documents.findFirst({ filters: { from } });
      if (!existing) {
        await documents.create({ data: { from, to, statusCode } });
        summary.created += 1;
      } else if (existing.to === to && existing.statusCode === statusCode) {
        summary.kept += 1;
      } else {
        await documents.update({ documentId: existing.documentId, data: { to, statusCode } });
        summary.updated += 1;
      }
    }
    return { summary, revalidate: await revalidateWeb(strapi, ['redirect']) };
  },
}));
