import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import type { WatchlistType } from '../../src/core/types/movie-watchlist/WatchlistType';
import MovieWatchlistView from '../../src/modules/movie-watchlist/views/MovieWatchlistView.vue';

const mocks = vi.hoisted(() => ({
  route: { params: { id: 'a' } },
  user: { user: { id: 'owner', isLoged: true } },
  store: { watchlists: [] as WatchlistType[], getWatchlists: vi.fn() },
  searchWatchlistById: vi.fn(),
  updateWatchlist: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie-watchlist/stores/MovieWatchlistStore', () => ({
  useMovieWatchlistStore: () => mocks.store,
}));
vi.mock('src/modules/movie-watchlist/services/MovieWatchlistService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({
  showSuccess: mocks.showSuccess,
  showError: mocks.showError,
}));
const wrappers: VueWrapper[] = [];
const list = (id = 'a', owner = 'owner'): WatchlistType => ({
  id,
  name: `List ${id}`,
  shareable: false,
  user: { id: owner, name: owner },
  created_at: new Date(),
  updated_at: new Date(),
  movies_wishlists: [1, 2, 3].map((tmdb_id) => ({
    tmdb_id,
    title: `Film ${tmdb_id}`,
    title_english: `Film ${tmdb_id}`,
    url_image: '/poster.jpg',
    release_date: new Date(),
  })),
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function create() {
  const wrapper = shallowMount(MovieWatchlistView, {
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
function button(wrapper: VueWrapper, text: string) {
  const found = wrapper.findAll('button').find((item) => item.text() === text);
  if (!found) throw new Error(`Button not found: ${text}`);
  return found;
}
function order(wrapper: VueWrapper) {
  return wrapper
    .findAllComponents({ name: 'MovieWatchlistImageCard' })
    .map((item) => item.props('movie').tmdb_id);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.route = reactive({ params: { id: 'a' } });
  mocks.user = reactive({ user: { id: 'owner', isLoged: true } });
  mocks.store = reactive({ watchlists: [list()], getWatchlists: vi.fn().mockResolvedValue(true) });
  mocks.searchWatchlistById.mockImplementation(async (id: string) => list(id));
  mocks.updateWatchlist.mockImplementation(async (value: WatchlistType) => value);
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

test('keyboard reorder and cancel never write or change confirmed order; sharing is locked', async () => {
  const wrapper = await create();
  await button(wrapper, 'Reordenar').trigger('click');
  expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBeDefined();
  await wrapper.find('button[aria-label="Mover Film 1 para depois"]').trigger('click');
  expect(order(wrapper)).toEqual([2, 1, 3]);
  expect(mocks.store.watchlists[0]?.movies_wishlists.map((movie) => movie.tmdb_id)).toEqual([
    1, 2, 3,
  ]);
  await button(wrapper, 'Cancelar').trigger('click');
  expect(order(wrapper)).toEqual([1, 2, 3]);
  expect(mocks.updateWatchlist).not.toHaveBeenCalled();
});

test('saving reorder submits exactly one payload with desired order', async () => {
  const wrapper = await create();
  const pending = deferred<WatchlistType>();
  mocks.updateWatchlist.mockReturnValue(pending.promise);
  await button(wrapper, 'Reordenar').trigger('click');
  await wrapper.find('button[aria-label="Mover Film 1 para depois"]').trigger('click');
  const save = button(wrapper, 'Salvar ordem');
  await save.trigger('click');
  await save.trigger('click');
  expect(mocks.updateWatchlist).toHaveBeenCalledTimes(1);
  const payload = mocks.updateWatchlist.mock.calls[0]![0] as WatchlistType;
  expect(payload.movies_wishlists.map((movie) => movie.tmdb_id)).toEqual([2, 1, 3]);
  pending.resolve(payload);
  await flushPromises();
  expect(wrapper.find('.mm-reorder-toolbar').exists()).toBe(false);
});

test('late sharing response cannot replace a newer route', async () => {
  const wrapper = await create();
  const pending = deferred<WatchlistType>();
  mocks.updateWatchlist.mockReturnValue(pending.promise);
  await wrapper.find('input[type="checkbox"]').setValue(true);
  mocks.route.params.id = 'b';
  await flushPromises();
  pending.resolve({ ...list('a'), shareable: true });
  await flushPromises();
  expect(wrapper.findComponent({ name: 'MovieWatchlistPageTitle' }).props('watchlist').id).toBe(
    'b',
  );
  expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false);
});

test('shared list visitor cannot reorder, rename, remove or change visibility', async () => {
  mocks.searchWatchlistById.mockResolvedValue(list('a', 'someone-else'));
  const wrapper = await create();
  expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
  expect(wrapper.findAll('button').some((item) => item.text() === 'Reordenar')).toBe(false);
  expect(wrapper.findComponent({ name: 'MovieWatchlistPageTitle' }).props('disabled')).toBe(true);
  expect(wrapper.findComponent({ name: 'MovieWatchlistImageCard' }).props('showRemoveItem')).toBe(
    false,
  );
  expect(mocks.updateWatchlist).not.toHaveBeenCalled();
});

test('failed visibility update restores the confirmed checkbox state', async () => {
  const wrapper = await create();
  mocks.updateWatchlist.mockRejectedValue(new Error('offline'));
  await wrapper.find('input[type="checkbox"]').setValue(true);
  await flushPromises();
  expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false);
  expect(mocks.showError).toHaveBeenCalled();
});

test('initial list skeleton replaces unknown title/count and disappears for resolved content', async () => {
  const request = deferred<WatchlistType>();
  mocks.searchWatchlistById.mockReturnValue(request.promise);
  const wrapper = await create();
  expect(wrapper.findComponent({ name: 'WatchlistLoadingState' }).exists()).toBe(true);
  expect(wrapper.find('h1').exists()).toBe(false);
  request.resolve(list());
  await flushPromises();
  expect(wrapper.findComponent({ name: 'WatchlistLoadingState' }).exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'MovieWatchlistPageTitle' }).props('watchlist').name).toBe(
    'List a',
  );
});
