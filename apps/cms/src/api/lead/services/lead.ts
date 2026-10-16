import { factories } from '@strapi/strapi';

// No core router: leads are personal data and must never be reachable through
// the generic REST API. The only route is POST /api/leads/submit (routes/submit.ts).
export default factories.createCoreService('api::lead.lead');
