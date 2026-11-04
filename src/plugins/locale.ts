import { localeCookieName, normalizeLocale } from '~/core/i18n/locale';
/** Initialize once per request/app, including Nuxt's standalone error renderer. */
export default defineNuxtPlugin({
  name: 'moviemux-locale',
  dependsOn: ['i18n:plugin:route-locale-detect'],
  async setup(app) {
    const preference = useCookie(localeCookieName, { decode: normalizeLocale });
    await app.$i18n.setLocale(normalizeLocale(preference.value));
  },
});
