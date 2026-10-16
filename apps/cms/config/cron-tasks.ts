import type { Core } from '@strapi/strapi';
import { retryDueLeads } from '../src/services/lead-pipeline';

export default {
  // D10: re-push leads whose Google Sheets sync failed or got stuck.
  leadSheetsRetry: {
    task: ({ strapi }: { strapi: Core.Strapi }) => retryDueLeads(strapi),
    options: { rule: process.env.LEAD_RETRY_CRON || '*/10 * * * *' },
  },
};
