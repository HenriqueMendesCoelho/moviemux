import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import pt from '../../i18n/locales/pt-BR/pages.json';
import en from '../../i18n/locales/en/pages.json';
const mocks = vi.hoisted(() => ({ clearError: vi.fn(), head: vi.fn() }));
vi.mock('#imports', () => ({ useHead: mocks.head, clearError: mocks.clearError }));
import ErrorPage from '../../src/error.vue';
function plugin(locale = 'pt-BR') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'pt-BR',
    messages: { 'pt-BR': { pages: pt }, en: { pages: en } },
  });
}
describe('localized page metadata and error recovery', () => {
  it('provides both translations for every page title and uses reactive metadata', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
    const paths = [
      '[...pathMatch].vue',
      'adm.vue',
      'home.vue',
      'profile.vue',
      'index.vue',
      'password/change/[key].vue',
      'movie/add.vue',
      'movie/dashboard.vue',
      'movie/discover.vue',
      'movie/watchlist/index.vue',
    ];
    for (const path of paths) {
      const source = readFileSync(`src/pages/${path}`, 'utf8');
      expect(source).toContain('useHead(() =>');
      const key = source.match(/t\('pages\.(\w+)'\)/)?.[1];
      expect(key).toBeDefined();
      expect(en).toHaveProperty(key!);
      expect(pt).toHaveProperty(key!);
    }
    const publicLayout = readFileSync('src/layouts/public.vue', 'utf8');
    expect(publicLayout).toContain('core/layout/public/PublicLayout.vue');
    const defaultLayout = readFileSync('src/layouts/default.vue', 'utf8');
    expect(defaultLayout).toContain('core/layout/app-with-nav/AppLayout.vue');
  });
  it.each([403, 404, 500])(
    'localizes a %s error without revealing upstream diagnostics',
    async (statusCode) => {
      const i18n = plugin();
      const wrapper = mount(ErrorPage, {
        props: {
          error: {
            statusCode,
            message: 'SECRET DIAGNOSTIC',
            statusMessage: 'PRIVATE UPSTREAM',
          } as { statusCode: number },
        },
        global: { plugins: [i18n], stubs: { PublicLayout: { template: '<main><slot /></main>' } } },
      });
      expect(wrapper.text()).not.toMatch(/SECRET|PRIVATE/);
      expect(wrapper.text()).toContain('Voltar ao início');
      i18n.global.locale.value = 'en';
      await nextTick();
      expect(wrapper.text()).toContain('Back to home');
      expect(wrapper.text()).toContain(
        statusCode === 403
          ? 'Access denied'
          : statusCode === 404
            ? 'Page not found'
            : 'Could not open this page',
      );
      const head = mocks.head.mock.calls.at(-1)![0]();
      expect(head.htmlAttrs.lang).toBe('en');
      expect(head.title).not.toMatch(/SECRET|PRIVATE/);
      await wrapper.get('button').trigger('click');
      expect(mocks.clearError).toHaveBeenCalledWith({ redirect: '/' });
      wrapper.unmount();
    },
  );
});
