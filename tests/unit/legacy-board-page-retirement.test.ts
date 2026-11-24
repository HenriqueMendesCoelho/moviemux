import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { H3Event } from 'h3';
import { COLLECTIONS_PATH } from '~/core/collection-browser-paths';
import redirect from '../../src/server/middleware/legacy-board-page-retirement';
import { defineNuxtRouteMiddleware, useRuntimeConfig } from './nuxt-stubs';

const config = vi.hoisted(() => ({ public: { legacyFilmHandoffEnabled: false as unknown } }));
vi.mock('nuxt/server', () => ({ useRuntimeConfig: () => config }));
const id = '00000000-0000-0000-0000-000000000001';

function request(url: string, method = 'GET') {
  const headers = new Headers();
  const res = {
    statusCode: 200,
    setHeader: (name: string, value: string) => headers.set(name, value),
  };
  const event = { node: { req: { url, method }, res }, res };
  const result = redirect(event as unknown as H3Event);
  return { result, headers, status: res.statusCode };
}

beforeEach(() => {
  config.public.legacyFilmHandoffEnabled = false;
});
afterEach(() => vi.stubGlobal('useRuntimeConfig', useRuntimeConfig));

test.each(['/home', '/movie/add', '/movie/dashboard', `/movie/edit/${id}`])(
  'early document handling for %s is default-off, private and GET-only when on',
  (url) => {
    expect(request(url).result).toBeUndefined();
    config.public.legacyFilmHandoffEnabled = 'true';
    const get = request(url + '?never=forward');
    expect(get.status).toBe(307);
    expect(get.headers.get('location')).toBe(COLLECTIONS_PATH + '#');
    expect(get.headers.get('cache-control')).toBe('no-store, private');
    expect(get.headers.get('referrer-policy')).toBe('no-referrer');
    for (const method of ['POST', 'PATCH', 'DELETE', 'HEAD']) {
      const nonGet = request(url, method);
      expect(nonGet.status).toBe(404);
      expect(nonGet.headers.get('location')).toBeNull();
    }
  },
);

test('bad operator configuration never mounts a retired page or impersonates a confirmed cutover', () => {
  config.public.legacyFilmHandoffEnabled = 'ACTIVE';
  const document = request('/home');
  expect(document.status).toBe(503);
  expect(document.headers.get('location')).toBeNull();
  expect(document.headers.get('cache-control')).toBe('no-store, private');
});

test.each([
  '/movie/discover?movie=123',
  '/movie/watchlist',
  `/movie/watchlist/${id}`,
  `/movie/${id}`,
  '/api/movie',
  '/movie/genres',
  '/adm',
  '/rankings',
  '/movies/collections',
])('document guard leaves %s to its actual handler', (url) => {
  config.public.legacyFilmHandoffEnabled = true;
  const document = request(url, 'GET');
  expect(document.result).toBeUndefined();
  expect([...document.headers]).toEqual([]);
});

test('SPA guards only board page records and never uses query or hash for redirection', async () => {
  vi.stubGlobal('defineNuxtRouteMiddleware', defineNuxtRouteMiddleware);
  const navigate = vi.fn();
  vi.stubGlobal('navigateTo', navigate);
  const { default: guard } = await import('../../src/middleware/01.legacy-board-retirement.global');
  const route = (name: string) =>
    ({ name, fullPath: '/movie/edit/legacy?secret=discard#fragment' }) as Parameters<
      typeof guard
    >[0];
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { legacyFilmHandoffEnabled: false } }));
  guard(route('home'), route('rankings'));
  expect(navigate).not.toHaveBeenCalled();
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { legacyFilmHandoffEnabled: 'true' } }));
  for (const name of ['movie', 'movie-discover', 'movie-watchlist-id', 'adm', 'ranking-join']) {
    guard(route(name), route('rankings'));
    expect(navigate).not.toHaveBeenCalled();
  }
  for (const name of ['home', 'add', 'movie-charts', 'movie-edit']) {
    guard(route(name), route('rankings'));
    expect(navigate).toHaveBeenLastCalledWith(COLLECTIONS_PATH, {
      redirectCode: 307,
      replace: true,
    });
  }
});
