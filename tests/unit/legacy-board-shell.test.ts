import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { afterEach, expect, test, vi } from 'vitest';
import BoardLinks from '~/core/layout/app-with-nav/SidebarRouteButtons.vue';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
import { useRuntimeConfig } from './nuxt-stubs';

const auth = vi.hoisted(() => ({ isAdmin: false }));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => auth }));
afterEach(() => vi.stubGlobal('useRuntimeConfig', useRuntimeConfig));

test.each([
  ['pt-BR', pt, ['Coleções', 'Descobrir']],
  ['en', en, ['Collections', 'Discover']],
] as const)(
  'retains shared links and locales in %s, retired links only when off',
  (locale, messages, labels) => {
    for (const active of [false, true]) {
      vi.stubGlobal('useRuntimeConfig', () => ({ public: { legacyFilmHandoffEnabled: active } }));
      for (const admin of [false, true]) {
        auth.isAdmin = admin;
        const wrapper = mount(BoardLinks, {
          global: {
            plugins: [createI18n({ legacy: false, locale, messages: { [locale]: messages } })],
            stubs: {
              NuxtLink: { props: ['to'], template: '<a :data-route="to.name"><slot /></a>' },
            },
          },
        });
        const names = wrapper.findAll('a').map((node) => node.attributes('data-route'));
        expect(names).toEqual([
          'rankings',
          ...(!active ? ['home'] : []),
          'movie-discover',
          'movie-watchlist-list',
          ...(!active ? ['movie-charts', 'add'] : []),
          ...(admin ? ['adm'] : []),
        ]);
        expect(wrapper.get('[data-route="rankings"]').text()).toBe(labels[0]);
        expect(wrapper.get('[data-route="movie-discover"]').text()).toBe(labels[1]);
        wrapper.unmount();
      }
    }
  },
);
