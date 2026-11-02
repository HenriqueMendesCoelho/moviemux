import { describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { createApiClient } from '../../src/core/createApiClient';
import { readBrowserAuthToken } from '../../src/core/session';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('request-scoped HTTP clients', () => {
  it('isolates concurrent users and resolves fresh credentials per request', async () => {
    const headers: string[] = [];
    const adapter = async (config: InternalAxiosRequestConfig) => {
      headers.push(String(config.headers.Authorization || ''));
      return { data: {}, status: 200, statusText: 'OK', config, headers: {} };
    };
    let firstToken = 'first-user';
    const first = createApiClient({ getToken: () => firstToken, onUnauthorized: vi.fn() });
    const second = createApiClient({ getToken: () => 'second-user', onUnauthorized: vi.fn() });
    first.defaults.adapter = adapter;
    second.defaults.adapter = adapter;
    await Promise.all([first.get('/profile'), second.get('/profile')]);
    expect(headers).toEqual(expect.arrayContaining(['Bearer first-user', 'Bearer second-user']));
    firstToken = 'renewed-first';
    await first.get('/profile');
    expect(headers.at(-1)).toBe('Bearer renewed-first');
  });
  it('handles transport errors without falsely expiring a session', async () => {
    const expired = vi.fn();
    const api = createApiClient({ getToken: () => null, onUnauthorized: expired });
    api.defaults.adapter = () => Promise.reject(new Error('Offline'));
    await expect(api.get('/movie')).rejects.toThrow('Offline');
    expect(expired).not.toHaveBeenCalled();
  });
  it('signals unauthorized response once', async () => {
    const expired = vi.fn();
    const api = createApiClient({ getToken: () => 'old', onUnauthorized: expired });
    api.defaults.adapter = () => Promise.reject({ response: { status: 401 } });
    await expect(api.get('/movie')).rejects.toBeDefined();
    expect(expired).toHaveBeenCalledOnce();
  });
});

describe('legacy cookie compatibility', () => {
  it('reads URI encoded token and ignores unrelated cookies', () => {
    document.cookie = 'other=value; path=/';
    document.cookie = 'auth-kb=abc%2Edef%2Eghi; path=/';
    expect(readBrowserAuthToken()).toBe('abc.def.ghi');
    document.cookie = 'auth-kb=; max-age=0; path=/';
    expect(readBrowserAuthToken()).toBe('');
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
