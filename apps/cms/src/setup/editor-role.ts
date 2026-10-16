import type { Core } from '@strapi/strapi';

// Bump when the Editor defaults below change; each version is applied once,
// so permissions an administrator edits by hand afterwards are kept.
const VERSION = 1;
const STORE_KEY = 'azway_editor_role_version';

const ROLE = {
  name: 'Editor',
  code: 'strapi-editor',
  description:
    'Biên tập viên: tạo, sửa, xoá, xuất bản nội dung. Không quản lý tài khoản; chỉ xem chuyển hướng URL và cấu hình chung; không thấy yêu cầu khách.',
};

const CONTENT = [
  'tour',
  'cruise',
  'teambuilding',
  'destination',
  'article',
  'article-category',
  'feedback',
  'homepage',
];
// BRD §3: only administrators handle redirects and site configuration.
// `lead` is not listed at all: personal data, Sales works in Google Sheets.
const READ_ONLY = ['redirect', 'site-setting'];

const EXPLORER_READ = 'plugin::content-manager.explorer.read';
const UPLOAD = [
  'plugin::upload.read',
  'plugin::upload.configure-view',
  'plugin::upload.assets.create',
  'plugin::upload.assets.update',
  'plugin::upload.assets.download',
  'plugin::upload.assets.copy-link',
];

type Permission = { action: string; subject?: string | null; properties?: Record<string, unknown> };

// Same shape the admin UI saves (explicit `fields` and `locales`); other
// shapes are hidden by the role editor and dropped on the next save there.
const editorPermissions = async (strapi: Core.Strapi): Promise<Permission[]> => {
  const uid = (name: string) => `api::${name}.${name}`;
  const editable = new Set(CONTENT.map(uid));
  const readOnly = new Set(READ_ONLY.map(uid));

  const { actionProvider } = strapi.service('admin::permission');
  const contentActions = actionProvider.values().filter((action: { section: string }) => action.section === 'contentTypes');
  const all: Permission[] = strapi.service('admin::content-type').getPermissionsWithNestedFields(contentActions);

  const locales = (await strapi.plugin('i18n').service('locales').find()).map((locale: { code: string }) => locale.code);
  const { isLocalizedContentType } = strapi.plugin('i18n').service('content-types');

  return [
    ...all
      .filter(({ action, subject }) => editable.has(subject!) || (readOnly.has(subject!) && action === EXPLORER_READ))
      .map((permission) =>
        isLocalizedContentType(strapi.contentTypes[permission.subject as keyof typeof strapi.contentTypes])
          ? { ...permission, properties: { ...permission.properties, locales } }
          : permission
      ),
    ...UPLOAD.map((action) => ({ action })),
  ];
};

// FR-CMS-08: Strapi's own first-boot "Editor" role has no locale access (and
// covers lead/redirect/site-setting), so it is replaced with the set above,
// once per VERSION.
export const configureEditorRole = async (strapi: Core.Strapi) => {
  const store = { type: 'core' as const, key: STORE_KEY };
  if (((await strapi.store.get(store)) as number | null) === VERSION) return;

  const roles = strapi.service('admin::role');
  const role = (await roles.findOne({ code: ROLE.code })) ?? (await roles.create(ROLE));
  await roles.update({ id: role.id }, { description: ROLE.description });
  await roles.assignPermissions(role.id, await editorPermissions(strapi));

  await strapi.store.set({ ...store, value: VERSION });
  strapi.log.info(`[setup] Editor role permissions applied (v${VERSION})`);
};
