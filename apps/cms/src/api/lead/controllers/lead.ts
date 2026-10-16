import type { Core } from '@strapi/strapi';
import { processLead } from '../../../services/lead-pipeline';
import { validateLeadInput } from '../../../services/lead-input';
import { maskPhone } from '../../../services/mask';

// The document service types optional fields as `T | undefined`, not null.
const withoutNulls = <T extends object>(input: T) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null)) as {
    [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
  };

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // Koa context; Strapi exports no typed context for custom actions.
  async submit(ctx: any) {
    const result = validateLeadInput(ctx.request.body);
    if (!result.ok) return ctx.badRequest('Invalid lead', { errors: result.errors });

    // D1: the lead is stored before anything else can fail.
    const lead = await strapi.documents('api::lead.lead').create({
      data: {
        ...withoutNulls(result.value),
        sheetsStatus: 'pending',
        sheetsAttempts: 0,
        notifyAttempts: 0,
      },
    });
    strapi.log.info(`[lead] received ${lead.documentId} phone=${maskPhone(lead.phone)}`);

    setImmediate(() => void processLead(strapi, lead.documentId));
    ctx.status = 201;
    ctx.body = { id: lead.documentId };
  },
});
