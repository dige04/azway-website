import type { Core } from '@strapi/strapi';

const LOCALE = { code: 'vi', name: 'Tiếng Việt (vi)' };

// D9: one locale `vi`, the default. Runs only while `vi` is missing, so a
// later manual change of the default locale is kept.
export const ensureVietnameseLocale = async (strapi: Core.Strapi) => {
  const locales = strapi.plugin('i18n').service('locales');
  if (await locales.findByCode(LOCALE.code)) return;

  await locales.create(LOCALE);
  await locales.setDefaultLocale({ code: LOCALE.code });

  // i18n seeds `en` on a fresh database; drop it only if nothing uses it.
  const en = await locales.findByCode('en');
  if (en && !(await hasEntriesIn(strapi, 'en'))) await locales.delete({ id: en.id });
  strapi.log.info('[setup] locale vi created and set as default');
};

const hasEntriesIn = async (strapi: Core.Strapi, locale: string) => {
  const { isLocalizedContentType } = strapi.plugin('i18n').service('content-types');
  for (const contentType of Object.values(strapi.contentTypes)) {
    if (!isLocalizedContentType(contentType)) continue;
    if ((await strapi.db.query(contentType.uid).count({ where: { locale } })) > 0) return true;
  }
  return false;
};
