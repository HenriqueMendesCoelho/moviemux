import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const kit = vi.hoisted(() => ({
  mode: false as unknown,
  fetchSession: vi.fn(),
  nav: vi.fn(),
  abort: vi.fn(),
  user: { isLoged: true, roles: ['USER'], expirationToken: 9999999999 },
}));
vi.mock('../../src/core/stores/UserStore', () => ({
  useUserStore: () => ({ sessionLoaded: false, fetchSession: kit.fetchSession, user: kit.user }),
}));
const id = 'aaaaaaaa-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.clearAllMocks();
  kit.mode = false;
  kit.user.isLoged = true;
  vi.stubGlobal('defineNuxtRouteMiddleware', (v: unknown) => v);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { legacyFilmHandoffEnabled: kit.mode } }));
  vi.stubGlobal('navigateTo', kit.nav);
  vi.stubGlobal('abortNavigation', kit.abort);
  vi.stubGlobal('createError', (v: unknown) => v);
});
afterEach(() => vi.unstubAllGlobals());
async function go(path = '/movie/' + id, name = 'movie') {
  const mw = (await import('../../src/middleware/auth.global')).default as unknown as (
    to: object,
  ) => Promise<unknown>;
  return mw({ path, fullPath: path + '?next=//evil.invalid#old', name, meta: { roles: ['USER'] } });
}
test('flag off preserves auth and legacy route without a document reload', async () => {
  await go();
  expect(kit.fetchSession).toHaveBeenCalledOnce();
  expect(kit.nav).not.toHaveBeenCalled();
  expect(kit.abort).not.toHaveBeenCalled();
});
test.each([true, 'true', null, 'invalid'])(
  'setting %j never mounts the old view via SPA',
  async (mode) => {
    kit.mode = mode;
    await go();
    expect(kit.fetchSession).not.toHaveBeenCalled();
    expect(kit.nav).toHaveBeenCalledExactlyOnceWith('/movie/' + id, {
      external: true,
      replace: true,
    });
  },
);
test('signed out route still goes only through server handoff, never arbitrary login returnTo', async () => {
  kit.mode = true;
  kit.user.isLoged = false;
  await go();
  expect(kit.nav).toHaveBeenCalledExactlyOnceWith('/movie/' + id, {
    external: true,
    replace: true,
  });
  expect(kit.fetchSession).not.toHaveBeenCalled();
});
test.each([
  '/movie/bad',
  '/movie/' + id.toUpperCase(),
  '/movie/%61' + id.slice(1),
  '/movie/' + id + '/',
])('invalid route %s is neutral before auth or navigation', async (path) => {
  kit.mode = true;
  await go(path);
  expect(kit.abort).toHaveBeenCalledExactlyOnceWith({
    statusCode: 404,
    statusMessage: 'Link unavailable',
  });
  expect(kit.nav).not.toHaveBeenCalled();
  expect(kit.fetchSession).not.toHaveBeenCalled();
});
test.each([
  ['/movie/discover', 'discover'],
  ['/movie/watchlist', 'watchlist'],
  ['/movies/collections/' + id, 'ranking-detail'],
])('does not loop or take over %s', async (path, name) => {
  kit.mode = true;
  await go(path, name);
  expect(kit.nav).not.toHaveBeenCalled();
  expect(kit.fetchSession).toHaveBeenCalledOnce();
});
test('canonical /rankings alias stays independent and never loops through /movie', async () => {
  kit.mode = true;
  await go('/rankings/' + id, 'ranking-detail');
  expect(kit.nav).toHaveBeenCalledExactlyOnceWith('/movies/collections/' + id, {
    replace: true,
    redirectCode: 307,
  });
});

test('persisted document resume re-enters server once, ordinary pageshow and canonical landing do not loop', async () => {
  let resume: ((event: { persisted: boolean }) => void) | undefined;
  const replace = vi.fn();
  const location = { pathname: '/movie/' + id, replace };
  vi.stubGlobal('window', {
    location,
    addEventListener: (_name: string, fn: typeof resume) => {
      resume = fn;
    },
  });
  vi.stubGlobal('defineNuxtPlugin', (v: unknown) => v);
  kit.mode = true;
  const plugin = (await import('../../src/plugins/legacy-film-handoff.client'))
    .default as unknown as () => void;
  plugin();
  resume!({ persisted: false });
  expect(replace).not.toHaveBeenCalled();
  resume!({ persisted: true });
  expect(replace).toHaveBeenCalledExactlyOnceWith('/movie/' + id);
  location.pathname = '/movies/collections/' + id;
  resume!({ persisted: true });
  expect(replace).toHaveBeenCalledTimes(1);
});
