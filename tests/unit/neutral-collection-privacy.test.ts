import { computed, reactive, shallowRef, watch } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const kit = vi.hoisted(() => ({
  user: null as any,
  movieReset: vi.fn(),
  listReset: vi.fn(),
  handlers: new Map<string, Array<(...args: unknown[]) => void>>(),
  sockets: [] as any[],
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('~/modules/movie/stores/MovieStore', () => ({
  useMovieStore: () => ({ $reset: kit.movieReset }),
}));
vi.mock('~/modules/movie-watchlist/stores/MovieWatchlistStore', () => ({
  useMovieWatchlistStore: () => ({ $reset: kit.listReset }),
}));
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const socket = {
      connected: false,
      sendBuffer: [{ old: true }],
      receiveBuffer: [{ old: true }],
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
    };
    socket.connect.mockImplementation(() => {
      socket.connected = true;
      return socket;
    });
    socket.disconnect.mockImplementation(() => {
      socket.connected = false;
      return socket;
    });
    socket.on.mockImplementation((name: string, handler: (...args: unknown[]) => void) => {
      kit.handlers.set(name, [...(kit.handlers.get(name) || []), handler]);
      return socket;
    });
    kit.sockets.push(socket);
    return socket;
  }),
}));
const pub = {
  name: 'public-collection',
  path: '/public/movies/collections/id',
  meta: { publicCollection: true, roles: ['UNSECURE'] },
};
const priv = { name: 'private', path: '/home', fullPath: '/home', meta: { roles: ['USER'] } };
const active = shallowRef<object>(priv);
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  kit.handlers.clear();
  kit.sockets.splice(0);
  active.value = priv;
  kit.user = reactive({
    user: {
      generation: 'a',
      isLoged: true,
      roles: ['USER'],
      expirationToken: Math.ceil(Date.now() / 1000) + 300,
    },
    csrfToken: 'stored',
    sessionLoaded: false,
    fetchSession: vi.fn().mockResolvedValue(undefined),
    applySession: vi.fn(),
  });
  vi.stubGlobal('defineNuxtPlugin', (value: unknown) => value);
  vi.stubGlobal('defineNuxtRouteMiddleware', (value: unknown) => value);
  vi.stubGlobal('useRouter', () => ({ currentRoute: active }));
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('watch', watch);
});
afterEach(() => vi.unstubAllGlobals());
test('only exact neutral page bypasses auth bootstrap, with no broader UNSECURE regression', async () => {
  const middleware = (await import('../../src/middleware/auth.global')).default as unknown as (
    route: object,
  ) => Promise<unknown>;
  await middleware(pub);
  await middleware({ ...pub, path: '/public/movies/collections/id/' });
  expect(kit.user.fetchSession).not.toHaveBeenCalled();
  await middleware({ ...pub, name: 'other' });
  await middleware({ ...pub, path: '/public/movies/collections/id/entries' });
  expect(kit.user.fetchSession).toHaveBeenCalledTimes(2);
  await middleware(priv);
  expect(kit.user.fetchSession).toHaveBeenCalledTimes(3);
});
test('private → public → private pauses old and late socket work without clearing auth', async () => {
  const plugin = (await import('../../src/plugins/socket.client')).default as unknown as () => void;
  const sockets = await import('../../src/boot/socket');
  plugin();
  expect(kit.sockets).toHaveLength(2);
  sockets.socketAllMovies.connect();
  sockets.socketMovie.connect();
  expect(kit.sockets.every((s) => s.connected)).toBe(true);
  active.value = { ...priv, path: '/other-private' };
  expect(kit.sockets.every((s) => s.connected)).toBe(true);
  active.value = pub;
  expect(kit.sockets.every((s) => !s.connected)).toBe(true);
  expect(kit.sockets.every((s) => !s.sendBuffer.length && !s.receiveBuffer.length)).toBe(true);
  expect(sockets.stateSocketMovie.csrfToken).toBe('');
  sockets.socketMovie.connect();
  sockets.socketMovie.emit('join-room', { room: 'stale' });
  kit.handlers.get('connect_error')?.forEach((cb) => cb({ data: { code: 'SESSION_REQUIRED' } }));
  kit.handlers.get('bridge:session-ended')?.forEach((cb) => cb());
  kit.user.csrfToken = 'new-session-response';
  expect(kit.sockets[1].connect).toHaveBeenCalledTimes(1);
  expect(kit.sockets[1].emit).not.toHaveBeenCalled();
  expect(kit.user.fetchSession).not.toHaveBeenCalled();
  expect(kit.user.applySession).not.toHaveBeenCalled();
  expect(kit.user.user.isLoged).toBe(true);
  expect(sockets.stateSocketMovie.csrfToken).toBe('');
  active.value = priv;
  expect(sockets.stateSocketMovie.csrfToken).toBe('new-session-response');
  expect(kit.sockets[1].connect).toHaveBeenCalledTimes(1);
  sockets.socketMovie.connect();
  expect(kit.sockets[1].connect).toHaveBeenCalledTimes(2);
  expect(kit.movieReset).not.toHaveBeenCalled();
  expect(kit.listReset).not.toHaveBeenCalled();
});

test('legacy links route to clean canonical paths before session load', async () => {
  const middleware = (await import('../../src/middleware/auth.global')).default as unknown as (
    route: object,
  ) => Promise<unknown>;
  const navigateTo = vi.fn();
  vi.stubGlobal('navigateTo', navigateTo);
  const id = 'abcdefab-2222-4222-8222-222222222222';
  for (const [path, canonical] of [
    ['/rankings', '/movies/collections'],
    [`/rankings/${id}/join`, `/movies/collections/${id}/join`],
    [`/public/rankings/${id}`, `/public/movies/collections/${id}`],
  ]) {
    await middleware({
      name: 'notFound',
      path,
      fullPath: `${path}?access=discard#discard`,
      meta: { roles: ['UNSECURE'] },
    });
    expect(navigateTo).toHaveBeenLastCalledWith(canonical, { replace: true, redirectCode: 307 });
  }
  expect(kit.user.fetchSession).not.toHaveBeenCalled();
  expect(navigateTo).toHaveBeenCalledTimes(3);

  kit.user.user.isLoged = false;
  const path = `/movies/collections/${id}/join`;
  await middleware({ ...priv, path, fullPath: path });
  expect(kit.user.fetchSession).toHaveBeenCalledTimes(1);
  expect(navigateTo).toHaveBeenLastCalledWith({ name: 'login', query: { from: path } });
});
