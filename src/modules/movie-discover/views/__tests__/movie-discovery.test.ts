import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils';
import MovieDiscoverView from '../MovieDiscoverView.vue';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
const mocks = vi.hoisted(() => ({
  route: { name: 'movie-discover', path: '/movie/discover', query: {} as Record<string, string> },
  user: { user: { id: 'owner', isLoged: true } },
  getMoviesPopular: vi.fn(),
  searchByName: vi.fn(),
  getMoviesDiscover: vi.fn(),
  getMoviesGenres: vi.fn(),
  listWatchlists: vi.fn(),
  addMovieToWatchlist: vi.fn(),
  replace: vi.fn(),
  scrollToContainer: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ replace: mocks.replace }),
}));
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
const wrappers: VueWrapper[] = [];
const result = (id: number, page = 1): MovieResultResponseTmdb => ({
  page,
  total_pages: 2,
  total_results: 2,
  results: [
    {
      id,
      title: `Film ${id}`,
      adult: false,
      backdrop_path: '',
      genre_ids: [],
      original_language: 'pt',
      original_title: '',
      overview: '',
      popularity: '',
      poster_path: '',
      release_date: '2026-01-01',
      video: false,
      vote_average: 8,
      vote_count: 2,
    },
  ],
});
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function create() {
  const wrapper = shallowMount(MovieDiscoverView, {
    global: { stubs: { BaseContainerMain: { template: '<main><slot /></main>' } } },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
function displayed(wrapper: VueWrapper) {
  return wrapper
    .findAllComponents({ name: 'MovieDiscoverCardImage' })
    .map((card) => card.props('movie').id);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.route = reactive({ name: 'movie-discover', path: '/movie/discover', query: {} });
  mocks.user = reactive({ user: { id: 'owner', isLoged: true } });
  mocks.getMoviesPopular.mockResolvedValue(result(1));
  mocks.searchByName.mockResolvedValue(result(3));
  mocks.getMoviesDiscover.mockResolvedValue(result(4));
  mocks.getMoviesGenres.mockResolvedValue([]);
  mocks.listWatchlists.mockResolvedValue([]);
  mocks.replace.mockResolvedValue(undefined);
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

test('newest search wins and a late older error cannot replace results or show an alert', async () => {
  const wrapper = await create();
  const first = pending<MovieResultResponseTmdb>(),
    second = pending<MovieResultResponseTmdb>();
  mocks.searchByName.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  await wrapper.get('#discover-search').setValue('old');
  await wrapper.get('form').trigger('submit');
  await wrapper.get('#discover-search').setValue('new');
  await wrapper.get('form').trigger('submit');
  second.resolve(result(2));
  await flushPromises();
  first.reject(new Error('stale'));
  await flushPromises();
  expect(displayed(wrapper)).toEqual([2]);
  expect(mocks.showError).not.toHaveBeenCalled();
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  expect(mocks.scrollToContainer).toHaveBeenCalledWith(0, 0, 'smooth');
});
test('Back and Forward query changes open/close the matching summary without refetch loops', async () => {
  const wrapper = await create();
  mocks.route.query = { movie: '42' };
  await flushPromises();
  let summary = wrapper.findComponent({ name: 'BaseDialogFormMovieSummary' });
  expect(summary.props('modelValue')).toBe(true);
  expect(summary.props('movieId')).toBe(42);
  mocks.route.query = {};
  await flushPromises();
  expect(summary.props('modelValue')).toBe(false);
  mocks.route.query = { movie: '43' };
  await flushPromises();
  summary = wrapper.findComponent({ name: 'BaseDialogFormMovieSummary' });
  expect(summary.props('movieId')).toBe(43);
  expect(mocks.getMoviesPopular).toHaveBeenCalledTimes(1);
});
test('explicit load more requests page two once and stops at the page bound', async () => {
  const wrapper = await create();
  const next = pending<MovieResultResponseTmdb>();
  mocks.getMoviesPopular.mockReturnValue(next.promise);
  const button = wrapper
    .findAll('button')
    .find((button) => button.text() === 'Carregar mais filmes')!;
  await button.trigger('click');
  await button.trigger('click');
  expect(mocks.getMoviesPopular).toHaveBeenLastCalledWith(2);
  expect(mocks.getMoviesPopular).toHaveBeenCalledTimes(2);
  next.resolve(result(2, 2));
  await flushPromises();
  expect(displayed(wrapper)).toEqual([1, 2]);
  expect(wrapper.findAll('button').some((button) => button.text() === 'Carregar mais filmes')).toBe(
    false,
  );
});
test('year filter reaches the existing discovery endpoint', async () => {
  const wrapper = await create();
  await wrapper.get('input[type="number"]').setValue('2024');
  await wrapper.get('input[type="number"]').trigger('change');
  await flushPromises();
  expect(mocks.getMoviesDiscover).toHaveBeenCalledWith(undefined, 1, 2024, undefined);
  expect(displayed(wrapper)).toEqual([4]);
});
test('closing a shared summary removes only movie query state', async () => {
  mocks.route.query = { movie: '42', retained: 'yes' };
  const wrapper = await create();
  wrapper.findComponent({ name: 'BaseDialogFormMovieSummary' }).vm.$emit('hide');
  await flushPromises();
  expect(mocks.replace).toHaveBeenCalledWith({
    path: '/movie/discover',
    query: { retained: 'yes' },
  });
});

test('autocomplete ignores an older response and late error after the account changes', async () => {
  const wrapper = await create();
  vi.useFakeTimers();
  const old = pending<MovieResultResponseTmdb>();
  const newest = pending<MovieResultResponseTmdb>();
  const after = pending<MovieResultResponseTmdb>();
  mocks.searchByName
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(newest.promise)
    .mockReturnValueOnce(after.promise);
  const input = wrapper.get('#discover-search');
  await input.trigger('focus');
  await input.setValue('old');
  await vi.advanceTimersByTimeAsync(250);
  await input.setValue('newest');
  await vi.advanceTimersByTimeAsync(250);
  newest.resolve(result(20));
  await flushPromises();
  expect(wrapper.get('[role="listbox"]').text()).toContain('Film 20');
  old.resolve(result(10));
  await flushPromises();
  expect(wrapper.get('[role="listbox"]').text()).not.toContain('Film 10');
  await input.setValue('after');
  await vi.advanceTimersByTimeAsync(250);
  mocks.user.user.id = 'other';
  after.reject(new Error('stale suggestions'));
  await flushPromises();
  expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  expect(mocks.showError).not.toHaveBeenCalled();
});
test('upstream failure is not presented as a successful empty search', async () => {
  mocks.getMoviesPopular.mockRejectedValue(new Error('upstream unavailable'));
  const wrapper = await create();
  expect(wrapper.get('[role="alert"]').text()).toContain('Sua busca não foi concluída');
  expect(wrapper.get('h2').text()).toBe('Não foi possível consultar o catálogo');
  expect(wrapper.text()).not.toContain('Nenhum filme por aqui');
});

test('themed genre selector maps TMDB IDs, filters without sprawling checkboxes and retries failures', async () => {
  mocks.getMoviesGenres
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([{ id: 7, name: 'Ação', tmdb_id: 28 }]);
  const wrapper = await create();
  const selector = wrapper.findComponent({ name: 'BaseMultiSelect' });
  expect(selector.props('error')).toContain('Não foi possível');
  selector.vm.$emit('retry');
  await flushPromises();
  expect(selector.props('options')).toEqual([{ value: 28, label: 'Ação' }]);
  selector.vm.$emit('update:modelValue', [28]);
  selector.vm.$emit('change', [28]);
  await flushPromises();
  expect(mocks.getMoviesDiscover).toHaveBeenLastCalledWith(undefined, 1, undefined, '28');
  expect(wrapper.find('input[type=checkbox]').exists()).toBe(false);
});
test('preview receives external rating only for its matching selected result and clears with account', async () => {
  const wrapper = await create();
  mocks.route.query = { movie: '1' };
  await flushPromises();
  const summary = wrapper.findComponent({ name: 'BaseDialogFormMovieSummary' });
  expect(summary.props('externalRating')).toEqual({ movieId: 1, value: 8, votes: 2 });
  mocks.route.query = { movie: '999' };
  await flushPromises();
  expect(summary.props('externalRating')).toBeUndefined();
  mocks.user.user.isLoged = false;
  await flushPromises();
  expect(summary.props('externalRating')).toBeUndefined();
});

test('themed Mostrar selector preserves the chosen category contract with one request', async () => {
  const wrapper = await create();
  const select = wrapper.findComponent({ name: 'BaseSelect' });
  expect(select.props('label')).toBe('Mostrar');
  expect(select.props('options')).toHaveLength(5);
  expect(wrapper.find('select').exists()).toBe(false);
  mocks.getMoviesDiscover.mockClear();
  select.vm.$emit('update:modelValue', 'voteAverageAsc');
  await flushPromises();
  select.vm.$emit('change', 'voteAverageAsc');
  await flushPromises();
  expect(mocks.getMoviesDiscover).toHaveBeenCalledExactlyOnceWith('vote_average.asc', 1);
  expect(select.props('modelValue')).toBe('voteAverageAsc');
  expect(displayed(wrapper)).toEqual([4]);
});

test('submitting an empty title preserves selected genres and year', async () => {
  const wrapper = await create();
  const selector = wrapper.findComponent({ name: 'BaseMultiSelect' });
  selector.vm.$emit('update:modelValue', [18, 878]);
  selector.vm.$emit('change', [18, 878]);
  await wrapper.get('input[type=number]').setValue('2025');
  await flushPromises();
  await wrapper.get('#discover-search').setValue('   ');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(selector.props('modelValue')).toEqual([18, 878]);
  expect((wrapper.get('input[type=number]').element as HTMLInputElement).value).toBe('2025');
  expect(mocks.getMoviesDiscover).toHaveBeenLastCalledWith(undefined, 1, 2025, '18,878');
  expect(mocks.searchByName).not.toHaveBeenCalled();
});
