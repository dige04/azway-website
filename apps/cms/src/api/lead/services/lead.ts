import { factories } from '@strapi/strapi';

// No controller or routes on purpose: leads are personal data and must never be
// reachable through the generic REST API (only the custom ingest route in M3).
export default factories.createCoreService('api::lead.lead');
