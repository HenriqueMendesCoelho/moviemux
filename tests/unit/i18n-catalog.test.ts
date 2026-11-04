import { describe, expect, test, vi } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { createI18n } from 'vue-i18n';
import pt from '../../i18n/locales/pt-BR/catalog.json';
import en from '../../i18n/locales/en/catalog.json';
import MovieDiscoverView from '../../src/modules/movie-discover/views/MovieDiscoverView.vue';
import MovieDiscoverCardImage from '../../src/modules/movie-discover/components/MovieDiscoverCardImage.vue';
import MovieHomeGridMovies from '../../src/modules/movie-home/components/MovieHomeGridMovies.vue';

const mocks = vi.hoisted(() => ({
  route: { name: 'movie-discover', path: '/movie/discover', query: {} },
  user: { user: { id: 'owner', isLoged: true } },
  getMoviesPopular: vi.fn(),
  searchByName: vi.fn(),
  getMoviesDiscover: vi.fn(),
  getMoviesSimilar: vi.fn(),
  getMoviesGenres: vi.fn(),
  getMoviesGenresWithMovies: vi.fn(),
  listMoviesPageable: vi.fn(),
  listWatchlists: vi.fn(),
  replace: vi.fn(),
  scrollToContainer: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => mocks }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/core/stores/StyleStore', () => ({ useStyleStore: () => mocks }));
vi.mock('src/core/services/KitService', () => ({ default: mocks }));
vi.mock('src/modules/movie/services/MovieService', () => ({ default: mocks }));
vi.mock('src/modules/movie-watchlist/services/MovieWatchlistService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('src/modules/movie/composables/useInfinitePaging', () => ({ useInfinitePaging: vi.fn() }));
vi.mock('src/boot/socket', () => ({ stateSocketAllMovies: { updateEvents: [] } }));
function i18n() {
  return createI18n({
    legacy: false,
    locale: 'pt-BR',
    fallbackLocale: 'pt-BR',
    messages: { 'pt-BR': { catalog: pt }, en: { catalog: en } },
  });
}
const stubs = { BaseContainerMain: { template: '<main><slot /></main>' } };

describe('catalog interface localization', () => {
  test('changes discovery labels and existing errors without clearing a search', async () => {
    mocks.user = reactive({ user: { id: 'owner', isLoged: true } });
    mocks.getMoviesPopular.mockRejectedValue(new Error('unavailable'));
    mocks.getMoviesGenres.mockResolvedValue([{ id: 1, tmdb_id: 28, name: 'Ação' }]);
    mocks.listWatchlists.mockResolvedValue([]);
    const plugin = i18n();
    const wrapper = shallowMount(MovieDiscoverView, { global: { plugins: [plugin], stubs } });
    await flushPromises();
    await wrapper.get('#discover-search').setValue('Cidade de Deus');
    expect(wrapper.text()).toContain('Descobrir filmes');
    plugin.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('Discover movies');
    expect(wrapper.text()).toContain('The movie service is currently unavailable');
    expect((wrapper.get('#discover-search').element as HTMLInputElement).value).toBe(
      'Cidade de Deus',
    );
    expect(wrapper.findComponent({ name: 'BaseMultiSelect' }).props('options')).toEqual([
      { value: 28, label: 'Action' },
    ]);
    expect(wrapper.findComponent({ name: 'BaseSelect' }).props('options')[0]).toEqual({
      value: 'popular',
      label: 'Popular',
    });
    wrapper.unmount();
  });

  test('related-result heading follows locale without changing the selected movie', async () => {
    const result = { results: [{ id: 42, title: 'Cidade de Deus' }], total_pages: 1 };
    mocks.getMoviesPopular.mockResolvedValue(result);
    mocks.getMoviesSimilar.mockResolvedValue(result);
    mocks.getMoviesGenres.mockResolvedValue([]);
    mocks.listWatchlists.mockResolvedValue([]);
    const plugin = i18n();
    const wrapper = shallowMount(MovieDiscoverView, { global: { plugins: [plugin], stubs } });
    await flushPromises();
    wrapper
      .findComponent({ name: 'MovieDiscoverCardImage' })
      .vm.$emit('callTmdb', { label: 'Cidade de Deus', value: 'similar' });
    await flushPromises();
    expect(wrapper.text()).toContain('Similares a Cidade de Deus');
    plugin.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('Similar to Cidade de Deus');
    expect(mocks.getMoviesSimilar).toHaveBeenCalledWith(42, 1);
    wrapper.unmount();
  });

  test('updates collection sort/genre labels while preserving backend sort values', async () => {
    mocks.getMoviesGenresWithMovies.mockResolvedValue([{ id: 7, tmdb_id: 28, name: 'Ação' }]);
    mocks.listMoviesPageable.mockResolvedValue({ content: [], total_pages: 0, total_elements: 0 });
    const plugin = i18n();
    const wrapper = shallowMount(MovieHomeGridMovies, { global: { plugins: [plugin] } });
    await flushPromises();
    plugin.global.locale.value = 'en';
    await nextTick();
    const options = wrapper.findComponent({ name: 'BaseSelect' }).props('options');
    expect(
      options.find((option: { value: string }) => option.value === 'portugueseTitle,asc'),
    ).toEqual({ value: 'portugueseTitle,asc', label: 'Title (A–Z)' });
    expect(wrapper.findComponent({ name: 'BaseMultiSelect' }).props('options')).toEqual([
      { value: 7, label: 'Action' },
    ]);
    expect(wrapper.text()).toContain('No movies found');
    wrapper.unmount();
  });

  test('retains authored movie title and emits an untranslated related title for reactive heading', async () => {
    const plugin = i18n();
    plugin.global.locale.value = 'en';
    const movie = { id: 42, title: 'Cidade de Deus', release_date: '', poster_path: '' };
    const wrapper = shallowMount(MovieDiscoverCardImage, {
      props: { movie: movie as never },
      global: {
        plugins: [plugin],
        stubs: { BaseContextMenu: { template: '<div><slot /></div>' } },
      },
    });
    expect(wrapper.text()).toContain('Cidade de Deus');
    expect(wrapper.text()).toContain('Coming soon');
    await wrapper.findAll('button')[0]!.trigger('click');
    expect(wrapper.emitted('callTmdb')?.[0]).toEqual([
      { label: 'Cidade de Deus', value: 'similar' },
    ]);
    wrapper.unmount();
  });
});
