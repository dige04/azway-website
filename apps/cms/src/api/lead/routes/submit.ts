// The only route for leads (D5): called by the web app's /api/lead handler
// with the shared X-Lead-Token, never by browsers. Body: ARCHITECTURE.md.
export default {
  routes: [
    {
      method: 'POST',
      path: '/leads/submit',
      handler: 'api::lead.lead.submit',
      config: { auth: false, policies: ['api::lead.has-ingest-token'] },
    },
  ],
};
