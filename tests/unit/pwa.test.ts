import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:url', () => ({ fileURLToPath: () => '/fixture/src' }));

afterEach(() => vi.unstubAllGlobals());

describe('private, network-first navigation semantics', () => {
  it('uses the network for online pages and only an offline fallback on failure', async () => {
    vi.stubGlobal('defineNuxtConfig', <T>(config: T) => config);
    const { default: config } = await import('../../nuxt.config');
    const workbox = config.pwa!.workbox!;
    expect(workbox.additionalManifestEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: '/offline.html', revision: expect.any(String) }),
      ]),
    );
    expect(workbox.clientsClaim).toBe(true);
    expect(workbox.navigateFallback).toBeUndefined();
    expect(workbox.globPatterns).toContain('offline.html');
    const routes = workbox.runtimeCaching as Array<{
      handler: string;
      urlPattern: (context: { request: { mode: string }; url: URL }) => boolean;
      options: { precacheFallback: { fallbackURL: string } };
    }>;
    expect(routes).toHaveLength(1);
    const route = routes[0]!;
    expect(route.handler).toBe('NetworkOnly');
    expect(route.options.precacheFallback.fallbackURL).toBe('/offline.html');
    expect(
      route.urlPattern({
        request: { mode: 'navigate' },
        url: new URL('https://example.test/home'),
      }),
    ).toBe(true);
    expect(
      route.urlPattern({
        request: { mode: 'cors' },
        url: new URL('https://example.test/api/movies'),
      }),
    ).toBe(false);
    expect(
      route.urlPattern({
        request: { mode: 'navigate' },
        url: new URL('https://example.test/api/movies'),
      }),
    ).toBe(false);
  });
});
