import { describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import {
  createApiClient,
  createInternalApiAdapter,
  safeApiPath,
  requestFetchBridge,
} from '../../src/core/createApiClient';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('request-scoped HTTP clients', () => {
  it('isolates public CSRF and never sends bearer credentials', async () => {
    const seen: InternalAxiosRequestConfig[] = [];
    const adapter = async (config: InternalAxiosRequestConfig) => {
      seen.push(config);
      return { data: {}, status: 200, statusText: 'OK', config, headers: {} };
    };
    let csrf = 'first';
    const first = createApiClient({ getCsrfToken: () => csrf, onUnauthorized: vi.fn(), adapter });
    const second = createApiClient({
      getCsrfToken: () => 'second',
      onUnauthorized: vi.fn(),
      adapter,
    });
    await Promise.all([first.post('/movie'), second.post('/movie')]);
    expect(seen.map((c) => c.headers.get('x-csrf-token'))).toEqual(['first', 'second']);
    csrf = 'fresh';
    await first.post('/movie', {}, { headers: { Authorization: 'Bearer forbidden' } });
    expect(seen.at(-1)?.headers.get('x-csrf-token')).toBe('fresh');
    expect(seen.at(-1)?.headers.has('Authorization')).toBe(false);
    await first.get('/movie');
    expect(seen.at(-1)?.headers.has('x-csrf-token')).toBe(false);
  });
  it('only signals unauthorized, not forbidden or transport failure', async () => {
    const expired = vi.fn();
    const api = createApiClient({ getCsrfToken: () => '', onUnauthorized: expired });
    for (const status of [403, 500, undefined]) {
      api.defaults.adapter = () => Promise.reject({ response: { status } });
      await expect(api.get('/movie')).rejects.toBeDefined();
    }
    expect(expired).not.toHaveBeenCalled();
    api.defaults.adapter = () => Promise.reject({ response: { status: 401 } });
    await expect(api.get('/movie')).rejects.toBeDefined();
    expect(expired).toHaveBeenCalledOnce();
  });
  it('ignores a stale unauthorized response after another login', async () => {
    let generation = 'old';
    const expired = vi.fn();
    const api = createApiClient({
      getCsrfToken: () => '',
      getSessionGeneration: () => generation,
      onUnauthorized: expired,
      adapter: async (config) => {
        generation = 'new';
        throw { config, response: { status: 401 } };
      },
    });
    await expect(api.get('/movie')).rejects.toBeDefined();
    expect(expired).not.toHaveBeenCalled();
  });
  it('rejects external or ambiguous credential forwarding paths', () => {
    for (const path of [
      'https://evil.test/api/a',
      '//evil.test/api/a',
      '/api/../user',
      '/api/%2e%2e/user',
      '/api/%252e/user',
      '/api/a%5cb',
    ]) {
      expect(() => safeApiPath(path)).toThrow();
    }
    expect(safeApiPath('/api/movie?page=1')).toBe('/api/movie?page=1');
  });
  it('supports the real plain-callable Nuxt request fetch shape without raw', async () => {
    const plainFetch = vi.fn(async (_path, options) => {
      const response = {
        _data: { user: { id: 'safe' } },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };
      options.onResponse({ response });
      return response._data;
    });
    expect('raw' in plainFetch).toBe(false);
    const api = createApiClient({
      getCsrfToken: () => '',
      onUnauthorized: vi.fn(),
      adapter: createInternalApiAdapter(requestFetchBridge(plainFetch)),
    });
    expect((await api.get('/_auth/session')).data).toEqual({ user: { id: 'safe' } });
    expect(plainFetch).toHaveBeenCalledWith(
      '/api/_auth/session',
      expect.objectContaining({ retry: 0, timeout: 20000, ignoreResponseError: true }),
    );
  });
  it('uses internal fetch for SSR and translates upstream errors', async () => {
    const internal = vi.fn().mockResolvedValue({
      _data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    });
    const api = createApiClient({
      getCsrfToken: () => 'csrf',
      onUnauthorized: vi.fn(),
      adapter: createInternalApiAdapter(internal),
    });
    await api.post('/movie', { name: 'test' });
    expect(internal).toHaveBeenCalledWith(
      '/api/movie',
      expect.objectContaining({ method: 'POST', body: '{"name":"test"}' }),
    );
    internal.mockResolvedValue({
      _data: {},
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
    });
    await expect(api.get('/movie')).rejects.toMatchObject({
      isAxiosError: true,
      response: { status: 403 },
    });
  });
});

describe('migration contracts', () => {
  it('keeps the exact domain module inventory', () => {
    expect(readdirSync('src/modules').sort()).toEqual(
      [
        'administrator',
        'change-password',
        'login',
        'movie',
        'movie-charts',
        'movie-discover',
        'movie-home',
        'movie-watchlist',
        'not-found',
        'profile',
      ].sort(),
    );
  });
  it('keeps all route names and final views through thin adapters', () => {
    const routes = [
      ['index', 'login', 'login/LoginView'],
      ['home', 'home', 'movie-home/MovieHomeView'],
      ['adm', 'adm', 'administrator/AdministratorView'],
      ['profile', 'profile', 'profile/ProfileView'],
      ['movie/[id]', 'movie', 'movie/MovieView'],
      ['movie/add', 'add', 'movie/MovieAddView'],
      ['movie/edit/[id]', 'movie-edit', 'movie/MovieEditView'],
      ['movie/discover', 'movie-discover', 'movie-discover/MovieDiscoverView'],
      ['movie/watchlist/index', 'movie-watchlist-list', 'movie-watchlist/MovieWatchlistsListView'],
      ['movie/watchlist/[id]', 'movie-watchlist-id', 'movie-watchlist/MovieWatchlistView'],
      ['movie/dashboard', 'movie-charts', 'movie-charts/MovieChartsView'],
      ['password/change/[key]', 'ChangePassword', 'change-password/ChangePasswordView'],
      ['[...pathMatch]', 'notFound', 'not-found/NotFoundView'],
    ];
    for (const [path, name, target] of routes) {
      const source = readFileSync(join('src/pages', `${path}.vue`), 'utf8');
      const [module, view] = target!.split('/');
      expect(source).toContain(`name: '${name}'`);
      expect(source).toContain(`modules/${module}/views/${view}.vue`);
    }
  });
  it('preserves cyan primary and original logo source', () => {
    expect(readFileSync('src/css/app.scss', 'utf8')).toMatch(/--primary:\s*#00f6ff/);
    expect(readFileSync('src/core/layout/app-with-nav/SideBar.vue', 'utf8')).toContain(
      'assets/logo.webp',
    );
    expect(readFileSync('src/modules/login/views/LoginView.vue', 'utf8')).toContain(
      'assets/logo.webp',
    );
  });
});

describe('theme persistence', () => {
  it('restores the saved preference in a fresh store', async () => {
    const { createPinia, setActivePinia } = await import('pinia');
    const { useStyleStore } = await import('../../src/core/stores/StyleStore');
    setActivePinia(createPinia());
    const first = useStyleStore();
    first.setTheme(false);
    expect(document.documentElement.dataset.theme).toBe('light');
    setActivePinia(createPinia());
    const fresh = useStyleStore();
    fresh.initializeTheme();
    expect(fresh.layoutSettings.darkMode).toBe(false);
    fresh.darkThemeToggle();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
