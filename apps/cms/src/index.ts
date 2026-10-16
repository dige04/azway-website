import type { Core } from '@strapi/strapi';
import { enforceAdminPasswordPolicy } from './lib/admin-password-policy';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    enforceAdminPasswordPolicy({
      userService: strapi.service('admin::user') as never,
      profileController: strapi.controller('admin::authenticated-user') as never,
    });
  },

  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};
