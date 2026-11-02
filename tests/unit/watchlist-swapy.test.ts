import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import type { SwapEvent, SwapEndEvent } from 'swapy';
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
const drag = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  enable: vi.fn(),
  swap: undefined as ((event: SwapEvent) => void) | undefined,
  end: undefined as ((event: SwapEndEvent) => void) | undefined,
  start: undefined as (() => void) | undefined,
  before: undefined as (() => boolean) | undefined,
}));
vi.mock('swapy', () => ({ createSwapy: drag.create }));
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
  drag.create.mockImplementation(() => ({
    destroy: drag.destroy,
    enable: drag.enable,
    onSwap: (handler: typeof drag.swap) => {
      drag.swap = handler;
    },
    onSwapEnd: (handler: typeof drag.end) => {
      drag.end = handler;
    },
    onSwapStart: (handler: typeof drag.start) => {
      drag.start = handler;
    },
    onBeforeSwap: (handler: typeof drag.before) => {
      drag.before = handler;
    },
  }));
  mocks.route = reactive({ params: { id: 'a' } });
  mocks.user = reactive({ user: { id: 'owner', isLoged: true } });
  mocks.store = reactive({ watchlists: [list()], getWatchlists: vi.fn().mockResolvedValue(true) });
  mocks.searchWatchlistById.mockImplementation(async (id: string) => list(id));
  mocks.updateWatchlist.mockImplementation(async (value: WatchlistType) => value);
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

async function enter(wrapper: VueWrapper) {
  await button(wrapper, 'Reordenar').trigger('click');
  await flushPromises();
  await nextTick();
}
function swapTo(ids: number[]) {
  drag.swap?.({
    newSlotItemMap: {
      asArray: ids.map((id, index) => ({ slot: `position-${index}`, item: String(id) })),
    },
  } as SwapEvent);
}

test('Swapy initializes only in reorder mode with explicit handles and manual Vue updates', async () => {
  const wrapper = await create();
  expect(drag.create).not.toHaveBeenCalled();
  await enter(wrapper);
  expect(drag.create).toHaveBeenCalledTimes(1);
  expect(drag.create.mock.calls[0]![1]).toMatchObject({
    manualSwap: true,
    swapMode: 'hover',
    dragOnHold: false,
    autoScrollOnDrag: true,
  });
  expect(wrapper.findAll('[data-swapy-slot]')).toHaveLength(3);
  expect(wrapper.findAll('button[data-swapy-handle]')).toHaveLength(3);
  expect(wrapper.find('[draggable="true"]').exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'MovieWatchlistImageCard' }).props('disabled')).toBe(true);
});

test('arbitrary drag permutations preserve confirmed data until save, and cancel destroys Swapy', async () => {
  const wrapper = await create();
  await enter(wrapper);
  swapTo([3, 1, 2]);
  await nextTick();
  expect(order(wrapper)).toEqual([3, 1, 2]);
  expect(mocks.store.watchlists[0]!.movies_wishlists.map((movie) => movie.tmdb_id)).toEqual([
    1, 2, 3,
  ]);
  await button(wrapper, 'Cancelar').trigger('click');
  expect(drag.destroy).toHaveBeenCalled();
  expect(order(wrapper)).toEqual([1, 2, 3]);
  expect(mocks.updateWatchlist).not.toHaveBeenCalled();
});

test('saving a drag permutation persists that exact order once and disables the instance while pending', async () => {
  const wrapper = await create();
  await enter(wrapper);
  swapTo([2, 3, 1]);
  await nextTick();
  const request = deferred<WatchlistType>();
  mocks.updateWatchlist.mockReturnValue(request.promise);
  const save = button(wrapper, 'Salvar ordem');
  await save.trigger('click');
  await save.trigger('click');
  expect(mocks.updateWatchlist).toHaveBeenCalledTimes(1);
  const payload = mocks.updateWatchlist.mock.calls[0]![0] as WatchlistType;
  expect(payload.movies_wishlists.map((movie) => movie.tmdb_id)).toEqual([2, 3, 1]);
  expect(drag.enable).toHaveBeenCalledWith(false);
  request.resolve(payload);
  await flushPromises();
  expect(order(wrapper)).toEqual([2, 3, 1]);
  expect(drag.destroy).toHaveBeenCalled();
});

test('failed save leaves server-confirmed order untouched and Cancel rolls back the displayed draft', async () => {
  const wrapper = await create();
  await enter(wrapper);
  swapTo([3, 2, 1]);
  await nextTick();
  mocks.updateWatchlist.mockRejectedValue(new Error('offline'));
  await button(wrapper, 'Salvar ordem').trigger('click');
  await flushPromises();
  expect(mocks.showError).toHaveBeenCalled();
  expect(mocks.store.watchlists[0]!.movies_wishlists.map((movie) => movie.tmdb_id)).toEqual([
    1, 2, 3,
  ]);
  expect(wrapper.find('.mm-reorder-toolbar').exists()).toBe(true);
  await button(wrapper, 'Cancelar').trigger('click');
  expect(order(wrapper)).toEqual([1, 2, 3]);
});

test('reduced motion disables Swapy animation and unmount releases its instance', async () => {
  const previous = window.matchMedia;
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  try {
    const wrapper = await create();
    await enter(wrapper);
    expect(drag.create.mock.calls[0]![1].animation).toBe('none');
    wrapper.unmount();
    expect(drag.destroy).toHaveBeenCalled();
  } finally {
    window.matchMedia = previous;
  }
});

test('poster clicks cannot open details during reorder and save is unavailable during active dragging', async () => {
  const wrapper = await create();
  await enter(wrapper);
  wrapper.findComponent({ name: 'MovieWatchlistImageCard' }).vm.$emit('open');
  await nextTick();
  expect(wrapper.findComponent({ name: 'BaseDialogFormMovieSummary' }).props('modelValue')).toBe(
    false,
  );
  drag.start?.();
  await nextTick();
  expect(button(wrapper, 'Salvar ordem').attributes('disabled')).toBeDefined();
  drag.end?.({ hasChanged: false } as SwapEndEvent);
  await nextTick();
  expect(button(wrapper, 'Salvar ordem').attributes('disabled')).toBeUndefined();
});

test('rebinds moved handle nodes after drop animation so another drag can start', async () => {
  const wrapper = await create();
  await enter(wrapper);
  drag.start?.();
  swapTo([3, 1, 2]);
  await nextTick();
  vi.useFakeTimers();
  try {
    drag.end?.({ hasChanged: true } as SwapEndEvent);
    await nextTick();
    expect(button(wrapper, 'Salvar ordem').attributes('disabled')).toBeDefined();
    await vi.advanceTimersByTimeAsync(340);
    await nextTick();
    expect(drag.destroy).toHaveBeenCalled();
    expect(drag.create).toHaveBeenCalledTimes(2);
    expect(button(wrapper, 'Salvar ordem').attributes('disabled')).toBeUndefined();
    drag.start?.();
    swapTo([2, 1, 3]);
    await nextTick();
    expect(order(wrapper)).toEqual([2, 1, 3]);
  } finally {
    vi.useRealTimers();
  }
});
