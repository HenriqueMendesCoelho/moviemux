import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { describe, expect, test, vi } from 'vitest';
vi.mock('src/core/stores/UserStore', () => ({
  useUserStore: () => ({ user: { id: 'owner', isLoged: true } }),
}));
import MovieWatchlistPageTitle from '../../src/modules/movie-watchlist/components/MovieWatchlistPageTitle.vue';
import pt from '../../i18n/locales/pt-BR/library.json';
import en from '../../i18n/locales/en/library.json';
import PersonalStatisticsCard from '../../src/modules/movie-charts/components/PersonalStatisticsCard.vue';
import MovieWatchlistCard from '../../src/modules/movie-watchlist/components/MovieWatchlistCard.vue';
import {
  formatDuration,
  formatRating,
} from '../../src/modules/movie-charts/utils/statisticsComparison';
import { compactMonthLabel } from '../../src/modules/movie-charts/utils/monthLabels';

function translations(locale = 'pt-BR') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'pt-BR',
    messages: {
      'pt-BR': { library: pt },
      en: { library: en },
    },
  });
}

describe('watchlist and statistics localization', () => {
  test('catalog keys and interpolation placeholders agree', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
    for (const key of Object.keys(pt) as (keyof typeof pt)[]) {
      expect([...en[key].matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort()).toEqual(
        [...pt[key].matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort(),
      );
    }
  });
  test('pluralization handles empty, singular and plural counts', () => {
    const i18n = translations('en');
    expect(i18n.global.t('library.movieCount', 0)).toBe('0 movies');
    expect(i18n.global.t('library.movieCount', 1)).toBe('1 movie');
    expect(i18n.global.t('library.movieCount', 2)).toBe('2 movies');
  });
  test('formats values without changing quantities or missing-data semantics', () => {
    expect(formatRating(7.5, 'pt-BR')).toBe('7,5');
    expect(formatRating(7.5, 'en')).toBe('7.5');
    expect(formatRating(null, 'en')).toBe('—');
    expect(formatDuration(119.9, 'en')).toBe('2h');
    expect(formatDuration(0, 'en')).toBe('0min');
    expect(formatDuration(null, 'en')).toBe('—');
    expect(formatDuration(60000, 'pt-BR')).toBe('1.000h');
    expect(formatDuration(60000, 'en')).toBe('1,000h');
  });
  test('localizes numeric and named upstream months without changing unknown labels', () => {
    expect(compactMonthLabel('2026-01', 'en')).toBe('Jan');
    expect(compactMonthLabel('janeiro/2026', 'en')).toBe('Jan');
    expect(compactMonthLabel('Março 2026', 'en')).toBe('Mar');
    expect(compactMonthLabel('dezembro - 2025', 'en')).toBe('Dec');
    expect(compactMonthLabel('janeiro - 2026', 'pt-BR')).toBe('jan');
    expect(compactMonthLabel('2026-12', 'pt-BR')).toBe('dez');
    expect(compactMonthLabel('2026-13', 'en')).toBe('2026-13');
    expect(compactMonthLabel('unknown', 'en')).toBe('unknown');
  });
  test('switches an already mounted statistics card and formats reactively', async () => {
    const i18n = translations();
    const wrapper = mount(PersonalStatisticsCard, {
      props: {
        loading: false,
        error: '',
        statistics: {
          ratings_given: 2,
          registered_movies: 1,
          display_time: 250,
          average_rating_movies: 7.5,
        },
        chartsData: {
          total_number_of_movies: 20,
          average_rate: 6.8,
          average_runtime: 117,
          movies_by_gender: {},
          movies_six_months_ago: {},
        },
      },
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toContain('Você e o MovieMux');
    expect(wrapper.text()).toContain('7,5');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('You and MovieMux');
    expect(wrapper.text()).toContain('7.5');
    expect(wrapper.find('[aria-label="Average rating comparison"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Suas avaliações');
    wrapper.unmount();
  });
  test('keeps authored list names and routes while translating controls', async () => {
    const i18n = translations('en');
    const wrapper = mount(MovieWatchlistCard, {
      props: {
        wishlist: {
          id: 'abc',
          name: 'Filmes de sábado',
          shareable: true,
          user: { id: 'owner', name: 'Ana' },
          movies_wishlists: [],
          created_at: '2026-01-01T12:00:00Z',
          updated_at: '2026-01-02T12:00:00Z',
        } as never,
      },
      global: {
        plugins: [i18n],
        stubs: {
          MovieWatchlistCardContextMenu: true,
          RouterLink: { props: ['to'], template: '<a><slot /></a>' },
        },
      },
    });
    expect(wrapper.text()).toContain('Filmes de sábado');
    expect(wrapper.text()).toContain('0 movies');
    expect(wrapper.text()).toContain('Public');
    expect(wrapper.find('[aria-label="Open list Filmes de sábado"]').exists()).toBe(true);
    i18n.global.locale.value = 'pt-BR';
    await nextTick();
    expect(wrapper.text()).toContain('0 filmes');
    expect(wrapper.text()).toContain('Filmes de sábado');
    wrapper.unmount();
  });
  test('switches an open rename form without losing typed content or closing it', async () => {
    const i18n = translations();
    const rename = vi.fn().mockResolvedValue(true);
    const wrapper = mount(MovieWatchlistPageTitle, {
      props: {
        watchlist: {
          id: 'abc',
          name: 'Filmes de sábado',
          shareable: true,
          user: { id: 'owner', name: 'Ana' },
          movies_wishlists: [],
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
        } as never,
        rename,
      },
      global: {
        plugins: [i18n],
        stubs: {
          MovieWatchlistTooltipInfo: true,
          BaseModal: {
            props: ['modelValue', 'title'],
            template: '<section v-if="modelValue"><h2>{{ title }}</h2><slot /></section>',
          },
        },
      },
    });
    await wrapper.get('.mm-rename-trigger').trigger('click');
    await wrapper.get('input').setValue('Minha próxima sessão');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.get('h2').text()).toBe('Rename list');
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Minha próxima sessão');
    expect(wrapper.text()).toContain('Save name');
    expect(rename).not.toHaveBeenCalled();
    await wrapper.get('form').trigger('submit');
    expect(rename).toHaveBeenCalledWith('Minha próxima sessão');
    wrapper.unmount();
  });
});
