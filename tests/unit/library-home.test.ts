import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import MovieHomeGridMovies from '../../src/modules/movie-home/components/MovieHomeGridMovies.vue';
import MovieHomeLastMovies from '../../src/modules/movie-home/components/MovieHomeLastMovies.vue';
import type { MoviePageableType } from '../../src/core/types/movie/MovieType';

const mocks = vi.hoisted(() => ({
  user: { user: { id: 'account-a', isLoged: true } },
  listMoviesPageable: vi.fn(),
  getMoviesGenresWithMovies: vi.fn(),
  showError: vi.fn(),
  connect: vi.fn(),
  socket: {
    connected: false,
    updateEvents: [] as { event: string }[],
    hasToExecuteUpdate: false,
    token: '',
  },
}));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie/services/MovieService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showError: mocks.showError }));
vi.mock('src/boot/socket', async () => {
  const { reactive } = await import('vue');
  mocks.socket = reactive(mocks.socket);
  return { socketAllMovies: { connect: mocks.connect }, stateSocketAllMovies: mocks.socket };
});
const wrappers: VueWrapper[] = [];
const observers: {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function page(ids: string[], totalPages = 1): MoviePageableType {
  return {
    content: ids.map((id) => ({ id, portuguese_title: id })),
    total_pages: totalPages,
    total_elements: ids.length,
  } as MoviePageableType;
}
async function grid() {
  const wrapper = shallowMount(MovieHomeGridMovies, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
async function latest() {
  const wrapper = shallowMount(MovieHomeLastMovies);
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
function cards(wrapper: VueWrapper) {
  return wrapper
    .findAllComponents({ name: 'MovieHomeCardImageGrid' })
    .map((item) => item.props('movie').id);
}
function latestCards(wrapper: VueWrapper) {
  return wrapper
    .findAllComponents({ name: 'MovieHomeCardImageLastMovies' })
    .map((item) => item.props('id'));
}
function intersect() {
  const observer = observers.at(-1);
  if (!observer) throw new Error('Missing observer');
  observer.callback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}
async function socketEvent() {
  mocks.socket.hasToExecuteUpdate = true;
  mocks.socket.updateEvents.push({ event: 'update' });
  await nextTick();
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  mocks.user = reactive({ user: { id: 'account-a', isLoged: true } });
  Object.assign(mocks.socket, {
    connected: false,
    updateEvents: [],
    hasToExecuteUpdate: false,
    token: '',
  });
  observers.length = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      readonly disconnect = vi.fn();
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, disconnect: this.disconnect });
      }
    },
  );
  mocks.getMoviesGenresWithMovies.mockResolvedValue([{ id: 7, name: 'Drama', tmdb_id: 18 }]);
  mocks.listMoviesPageable.mockResolvedValue(page(['initial'], 3));
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('autocomplete ignores a slower response for a previous query', async () => {
  const wrapper = await grid();
  const older = deferred<MoviePageableType>();
  const newer = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockImplementation(({ title, size }) =>
    size === 8
      ? title === 'old'
        ? older.promise
        : newer.promise
      : Promise.resolve(page(['initial'])),
  );
  const input = wrapper.find('#library-search');
  await input.trigger('focus');
  await input.setValue('old');
  await vi.advanceTimersByTimeAsync(250);
  await input.setValue('new');
  await vi.advanceTimersByTimeAsync(250);
  newer.resolve(page(['new suggestion']));
  await flushPromises();
  expect(wrapper.find('[role="listbox"]').text()).toBe('new suggestion');
  older.resolve(page(['old suggestion']));
  await flushPromises();
  expect(wrapper.find('[role="listbox"]').text()).toBe('new suggestion');
});

test('search and sort latest request wins and restarts pagination at page one', async () => {
  const wrapper = await grid();
  const older = deferred<MoviePageableType>();
  const newer = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockImplementation(({ sort }) =>
    sort === 'portugueseTitle,asc' ? older.promise : newer.promise,
  );
  await wrapper.find('select').setValue('portugueseTitle,asc');
  await wrapper.find('select').setValue('portugueseTitle,desc');
  newer.resolve(page(['new-result'], 2));
  await flushPromises();
  older.resolve(page(['stale-result'], 8));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['new-result']);
  expect(mocks.listMoviesPageable.mock.calls.slice(-2).map(([params]) => params.page)).toEqual([
    1, 1,
  ]);
  const next = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValue(next.promise);
  intersect();
  await flushPromises();
  expect(mocks.listMoviesPageable).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2, sort: 'portugueseTitle,desc' }),
  );
  next.resolve(page(['page-two'], 2));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['new-result', 'page-two']);
});

test('repeated identical search submits do not duplicate the pending first page', async () => {
  const wrapper = await grid();
  const pending = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValue(pending.promise);
  mocks.listMoviesPageable.mockClear();
  await wrapper.find('#library-search').setValue('same');
  await wrapper.find('form').trigger('submit');
  await wrapper.find('form').trigger('submit');
  expect(mocks.listMoviesPageable).toHaveBeenCalledTimes(1);
  pending.resolve(page(['same']));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['same']);
});

test('observer and repeated load-more clicks request each page once and deduplicate rows', async () => {
  const wrapper = await grid();
  const second = deferred<MoviePageableType>();
  const third = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockImplementation(({ page: number }) =>
    number === 2 ? second.promise : third.promise,
  );
  mocks.listMoviesPageable.mockClear();
  intersect();
  intersect();
  await wrapper.find('.mm-load-more button').trigger('click');
  expect(mocks.listMoviesPageable).toHaveBeenCalledTimes(1);
  expect(mocks.listMoviesPageable).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  second.resolve(page(['initial', 'second', 'second'], 3));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['initial', 'second']);
  intersect();
  intersect();
  expect(mocks.listMoviesPageable).toHaveBeenCalledTimes(2);
  expect(mocks.listMoviesPageable).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
  third.resolve(page(['third'], 3));
  await flushPromises();
  intersect();
  expect(mocks.listMoviesPageable).toHaveBeenCalledTimes(2);
  expect(cards(wrapper)).toEqual(['initial', 'second', 'third']);
});

test('stale account search is ignored after another account loads its results', async () => {
  const wrapper = await grid();
  const old = deferred<MoviePageableType>();
  const fresh = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  await wrapper.find('form').trigger('submit');
  mocks.user.user = { id: 'account-b', isLoged: true };
  await flushPromises();
  fresh.resolve(page(['account-b-result']));
  await flushPromises();
  old.resolve(page(['private-account-a-result']));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['account-b-result']);
});

test('unmount ignores pending search failures and disconnects intersection observer', async () => {
  const wrapper = await grid();
  const pending = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValue(pending.promise);
  await wrapper.find('form').trigger('submit');
  const observer = observers.at(-1)!;
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  pending.reject(new Error('late'));
  await flushPromises();
  expect(observer.disconnect).toHaveBeenCalledTimes(1);
  expect(mocks.showError).not.toHaveBeenCalled();
});

test('unmount during genre lookup does not start a movie request or observer', async () => {
  const genres = deferred<{ id: number; name: string; tmdb_id: number }[]>();
  mocks.getMoviesGenresWithMovies.mockReturnValue(genres.promise);
  const wrapper = await grid();
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  genres.resolve([]);
  await flushPromises();
  expect(mocks.listMoviesPageable).not.toHaveBeenCalled();
  expect(observers).toHaveLength(0);
});

test('realtime refresh bursts coalesce into one trailing request and clear pending only after success', async () => {
  const wrapper = await latest();
  const first = deferred<MoviePageableType>();
  const trailing = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockClear();
  mocks.listMoviesPageable.mockReturnValueOnce(first.promise).mockReturnValueOnce(trailing.promise);
  await socketEvent();
  await socketEvent();
  await socketEvent();
  expect(mocks.listMoviesPageable).toHaveBeenCalledTimes(1);
  first.resolve(page(['intermediate']));
  await flushPromises();
  expect(mocks.listMoviesPageable).toHaveBeenCalledTimes(2);
  expect(mocks.socket.hasToExecuteUpdate).toBe(true);
  trailing.resolve(page(['latest']));
  await flushPromises();
  expect(latestCards(wrapper)).toEqual(['latest']);
  expect(mocks.socket.hasToExecuteUpdate).toBe(false);
});

test('failed realtime refresh keeps its pending marker and explicit retry clears it', async () => {
  const wrapper = await latest();
  mocks.listMoviesPageable.mockRejectedValueOnce(new Error('offline'));
  await socketEvent();
  await flushPromises();
  expect(mocks.socket.hasToExecuteUpdate).toBe(true);
  expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  mocks.listMoviesPageable.mockResolvedValue(page(['recovered']));
  await wrapper
    .findAll('button')
    .find((item) => item.attributes('aria-label') === 'Atualizar recentes')!
    .trigger('click');
  await flushPromises();
  expect(latestCards(wrapper)).toEqual(['recovered']);
  expect(mocks.socket.hasToExecuteUpdate).toBe(false);
});

test('latest films ignores old-account responses and no socket connects after unmount', async () => {
  const old = deferred<MoviePageableType>();
  const fresh = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const wrapper = await latest();
  mocks.user.user = { id: 'account-b', isLoged: true };
  await flushPromises();
  fresh.resolve(page(['account-b']));
  await flushPromises();
  old.resolve(page(['account-a']));
  await flushPromises();
  expect(latestCards(wrapper)).toEqual(['account-b']);
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  mocks.connect.mockClear();
  await socketEvent();
  await flushPromises();
  expect(mocks.connect).not.toHaveBeenCalled();
});

test('account change cancels an autocomplete timer before it can call the API', async () => {
  const wrapper = await grid();
  mocks.listMoviesPageable.mockClear();
  await wrapper.find('#library-search').setValue('old-account-query');
  mocks.user.user = { id: '', isLoged: false };
  await nextTick();
  await vi.advanceTimersByTimeAsync(250);
  await flushPromises();
  expect(mocks.listMoviesPageable).not.toHaveBeenCalled();
});

test('unmount before initial latest request completes neither connects socket nor reports stale failure', async () => {
  const pending = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValue(pending.promise);
  const wrapper = await latest();
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  pending.reject(new Error('late offline'));
  await flushPromises();
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(mocks.showError).not.toHaveBeenCalled();
});

test('unmount before genre failure suppresses stale notifications', async () => {
  const pending = deferred<{ id: number; name: string; tmdb_id: number }[]>();
  mocks.getMoviesGenresWithMovies.mockReturnValue(pending.promise);
  const wrapper = await grid();
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  pending.reject(new Error('late offline'));
  await flushPromises();
  expect(mocks.listMoviesPageable).not.toHaveBeenCalled();
  expect(mocks.showError).not.toHaveBeenCalled();
});

test('explicit title searches discard old results and retain the newest filter payload', async () => {
  const wrapper = await grid();
  const older = deferred<MoviePageableType>();
  const newer = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockImplementation(({ title }) =>
    title === 'old title' ? older.promise : newer.promise,
  );
  await wrapper.find('#library-search').setValue('old title');
  await wrapper.find('form').trigger('submit');
  await wrapper.find('#library-search').setValue('new title');
  await wrapper.find('form').trigger('submit');
  newer.resolve(page(['new title'], 2));
  await flushPromises();
  older.resolve(page(['old title'], 2));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['new title']);
  expect(mocks.listMoviesPageable).toHaveBeenLastCalledWith(
    expect.objectContaining({ title: 'new title', page: 1, size: 30 }),
  );
});

test('failed next page can retry the same page without skipping or losing earlier rows', async () => {
  const wrapper = await grid();
  mocks.listMoviesPageable.mockRejectedValueOnce(new Error('page offline'));
  intersect();
  await flushPromises();
  expect(cards(wrapper)).toEqual(['initial']);
  expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível');
  const retry = deferred<MoviePageableType>();
  mocks.listMoviesPageable.mockReturnValue(retry.promise);
  await wrapper.find('.mm-load-more button').trigger('click');
  expect(mocks.listMoviesPageable).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  retry.resolve(page(['second'], 2));
  await flushPromises();
  expect(cards(wrapper)).toEqual(['initial', 'second']);
});

test('home grid has no duplicate Add or floating action and search submit is secondary', async () => {
  mocks.listMoviesPageable.mockResolvedValue(page([]));
  const wrapper = await grid();
  expect(wrapper.findComponent({ name: 'MovieHomeFloatingActionButton' }).exists()).toBe(false);
  expect(wrapper.findAll('.mm-button-primary')).toHaveLength(0);
  expect(wrapper.find('button[aria-label="Buscar na coleção"]').exists()).toBe(true);
});

test('recent controls have accessible compact labels and expansion keeps all ten films', async () => {
  mocks.listMoviesPageable.mockResolvedValue(
    page(Array.from({ length: 10 }, (_, index) => `${index}`)),
  );
  const wrapper = await latest();
  expect(wrapper.find('h2').text()).toBe('Recentes');
  expect(wrapper.findAll('.mm-recent-actions button')).toHaveLength(2);
  expect(wrapper.find('button[aria-label="Recolher recentes"]').attributes('aria-expanded')).toBe(
    'true',
  );
  expect(latestCards(wrapper)).toHaveLength(10);
  await wrapper.find('.mm-recent-more').trigger('click');
  expect(wrapper.find('.mm-recent-strip').classes()).toContain('mm-recent-expanded');
  expect(wrapper.find('.mm-recent-more').text()).toBe('Ver menos');
  await wrapper.find('button[aria-label="Recolher recentes"]').trigger('click');
  expect(wrapper.find('button[aria-label="Expandir recentes"]').attributes('aria-expanded')).toBe(
    'false',
  );
});
