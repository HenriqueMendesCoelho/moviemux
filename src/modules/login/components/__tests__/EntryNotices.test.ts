import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import account from '../../../../../i18n/locales/pt-BR/account.json';
import NecessaryCookieNotice from '../NecessaryCookieNotice.vue';
import TmdbCredits from '../TmdbCredits.vue';
import tmdbLogo from 'src/assets/tmdb-logo-long.svg';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('entry notices', () => {
  it('renders the necessary-cookie information in SSR without blocking the form', async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(NecessaryCookieNotice) }).use(
        createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': { account }, en: { account } } }),
      ),
    );
    expect(html).toContain('Cookies necessários');
    expect(html).toContain('apenas confirma a leitura');
    expect(html).not.toContain('role="dialog"');
  });
  it('acknowledges reading, persists no consent choice, and hides on the next visit', async () => {
    const wrapper = mount(NecessaryCookieNotice);
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(localStorage.getItem('moviemux:necessary-cookie-notice:v1')).toBe('acknowledged');
    wrapper.unmount();
    const next = mount(NecessaryCookieNotice);
    await next.vm.$nextTick();
    expect(next.find('aside').exists()).toBe(false);
    next.unmount();
  });
  it('allows acknowledgement if browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const wrapper = mount(NecessaryCookieNotice);
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    wrapper.unmount();
  });
  it('provides an accessible Credits section, official linked asset and exact TMDB notice', () => {
    const wrapper = mount(TmdbCredits);
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(
      wrapper.get('h2').attributes('id'),
    );
    expect(wrapper.get('h2').text()).toBe('Créditos');
    expect(wrapper.get('a').attributes('href')).toBe('https://www.themoviedb.org');
    expect(wrapper.get('img').attributes('src')).toBe(tmdbLogo);
    expect(wrapper.get('p').text()).toBe(
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    );
    expect(wrapper.get('p').attributes('lang')).toBe('en');
    wrapper.unmount();
  });
});
