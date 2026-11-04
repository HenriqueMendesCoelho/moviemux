import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import { compileStyle, parse } from 'vue/compiler-sfc';
import MovieWatchlistView from 'src/modules/movie-watchlist/views/MovieWatchlistView.vue';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

const mocks = vi.hoisted(() => ({
  route: { params: { id: 'test-list' } },
  user: { user: { id: 'owner', isLoged: true } },
  store: { watchlists: [] as WatchlistType[], getWatchlists: vi.fn() },
  searchWatchlistById: vi.fn(),
  updateWatchlist: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie-watchlist/stores/MovieWatchlistStore', () => ({
  useMovieWatchlistStore: () => mocks.store,
}));
vi.mock('src/modules/movie-watchlist/services/MovieWatchlistService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock('swapy', () => ({
  createSwapy: () => ({
    destroy() {},
    enable() {},
    onBeforeSwap() {},
    onSwapStart() {},
    onSwap() {},
    onSwapEnd() {},
  }),
}));
const wrappers: VueWrapper[] = [];
const list = (): WatchlistType => ({
  id: 'test-list',
  name: 'Test list',
  shareable: false,
  user: { id: 'owner', name: 'Owner' },
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  movies_wishlists: [
    {
      tmdb_id: 1,
      title: 'A Chegada',
      title_english: 'Arrival',
      url_image: '',
      release_date: new Date(),
    },
    {
      tmdb_id: 2,
      title: 'Interestelar',
      title_english: 'Interstellar',
      url_image: '',
      release_date: new Date(),
    },
  ],
});
async function setup() {
  const wrapper = shallowMount(MovieWatchlistView, {
    attachTo: document.body,
    global: {
      stubs: {
        BaseContainerMain: { template: '<main><slot /></main>' },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.watchlists = [list()];
  mocks.store.getWatchlists.mockResolvedValue(true);
  mocks.searchWatchlistById.mockResolvedValue(list());
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

test('keeps label, native suggestions, case-insensitive local filtering and the result count', async () => {
  const wrapper = await setup();
  const input = wrapper.get('input.mm-search-input');
  expect(wrapper.get('.mm-search-field').text()).toContain('Buscar nesta lista');
  expect(input.attributes('list')).toBe('watchlist-titles');
  expect(wrapper.findAll('datalist option').map((option) => option.attributes('value'))).toEqual([
    'A Chegada',
    'Interestelar',
  ]);
  await input.setValue('  ARRIVAL ');
  await wrapper.get('form.mm-filter-bar').trigger('submit');
  expect(wrapper.get('.mm-result-count').text()).toBe('1 filme');
  expect(wrapper.findAllComponents({ name: 'MovieWatchlistImageCard' })).toHaveLength(1);
  expect(wrapper.getComponent({ name: 'MovieWatchlistImageCard' }).props('movie').tmdb_id).toBe(1);
  await input.setValue('unknown');
  expect(wrapper.get('.mm-result-count').text()).toBe('0 filmes');
  expect(wrapper.get('.mm-empty').text()).toBe('Nenhum filme corresponde à busca.');
  expect(mocks.updateWatchlist).not.toHaveBeenCalled();
  expect(mocks.searchWatchlistById).toHaveBeenCalledTimes(1);
});

test('clearing restores every movie and puts keyboard focus back in the same search field', async () => {
  const wrapper = await setup();
  const input = wrapper.get<HTMLInputElement>('input.mm-search-input');
  await input.setValue('chegada');
  const clear = wrapper.get<HTMLButtonElement>('button[aria-label="Limpar busca"]');
  clear.element.focus();
  await clear.trigger('click');
  await flushPromises();
  expect(input.element.value).toBe('');
  expect(document.activeElement).toBe(input.element);
  expect(wrapper.get('.mm-result-count').text()).toBe('2 filmes');
  expect(wrapper.find('button[aria-label="Limpar busca"]').exists()).toBe(false);
  expect(mocks.store.watchlists[0]!.movies_wishlists.map((movie) => movie.tmdb_id)).toEqual([1, 2]);
  expect(mocks.updateWatchlist).not.toHaveBeenCalled();
});

test('retains disabled state while saving and keeps the field out of reorder mode', async () => {
  const wrapper = await setup();
  let finish!: (value: WatchlistType) => void;
  mocks.updateWatchlist.mockReturnValue(
    new Promise<WatchlistType>((resolve) => {
      finish = resolve;
    }),
  );
  await wrapper.get('input[type="checkbox"]').setValue(true);
  expect(wrapper.get('input.mm-search-input').attributes('disabled')).toBeDefined();
  finish({ ...list(), shareable: true });
  await flushPromises();
  expect(wrapper.get('input.mm-search-input').attributes('disabled')).toBeUndefined();
  const reorder = wrapper.findAll('button').find((button) => button.text() === 'Reordenar')!;
  await reorder.trigger('click');
  await flushPromises();
  expect(wrapper.find('.mm-filter-bar').exists()).toBe(false);
  const cancel = wrapper.findAll('button').find((button) => button.text() === 'Cancelar')!;
  await cancel.trigger('click');
  expect(wrapper.find('input.mm-search-input').exists()).toBe(true);
});

test('compiled scoped reset outranks generic inputs and leaves one outer focus boundary', () => {
  const source = readFileSync('src/modules/movie-watchlist/views/MovieWatchlistView.vue', 'utf8');
  const css = parse(source).descriptor.styles[0]!.content;
  const compiled = compileStyle({ source: css, id: 'data-v-search', scoped: true });
  expect(compiled.errors).toEqual([]);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(compiled.code);
  const rules = Array.from(sheet.cssRules) as CSSStyleRule[];
  // Three local classes plus Vue's scope attribute outrank the three global :not() attributes.
  const input = rules.find(
    (rule) =>
      rule.selectorText === '.mm-filter-bar .mm-search-field input.mm-search-input[data-v-search]',
  )!;
  expect(input).toBeDefined();
  expect(input.style.border).toBe('0px');
  expect(input.style.background).toBe('transparent');
  expect(input.style.borderRadius).toBe('0px');
  expect(input.style.minWidth).toBe('0');
  expect(input.style.padding).toBe('12px 0px');
  expect(input.style.boxShadow).toBe('none');
  expect(
    rules.some((rule) =>
      rule.selectorText?.includes('.mm-search-field[data-v-search]:focus-within'),
    ),
  ).toBe(true);
});
