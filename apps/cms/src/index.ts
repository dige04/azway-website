import type { Core } from '@strapi/strapi';
import { enforceAdminPasswordPolicy } from './lib/admin-password-policy';
import { registerDocumentMiddlewares } from './setup/document-middlewares';
import { configureEditorRole } from './setup/editor-role';
import { ensureVietnameseLocale } from './setup/locale';
import { ensurePublicPermissions } from './setup/public-permissions';
import { closePublicSignUp } from './setup/sign-up';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    enforceAdminPasswordPolicy({
      userService: strapi.service('admin::user') as never,
      profileController: strapi.controller('admin::authenticated-user') as never,
    });
    registerDocumentMiddlewares(strapi);
  },

  // Idempotent: safe on every start; each step says which manual changes it keeps.
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureVietnameseLocale(strapi);
    await ensurePublicPermissions(strapi);
    await configureEditorRole(strapi);
    await closePublicSignUp(strapi);
  },
};
