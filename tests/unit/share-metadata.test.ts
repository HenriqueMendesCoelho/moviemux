import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('node:url', () => ({ fileURLToPath: () => '/fixture/src' }));
afterEach(() => vi.unstubAllGlobals());
describe('MovieMux sharing and PWA accent metadata', () => {
  it('publishes exactly one global SSR theme-color using the unchanged primary', async () => {
    vi.stubGlobal('defineNuxtConfig', <T>(config: T) => config);
    const { default: config } = await import('../../nuxt.config');
    const accents = config.app!.head!.meta!.filter((meta) => meta.name === 'theme-color');
    expect(accents).toEqual([{ name: 'theme-color', content: '#00f6ff' }]);
  });
  it('keeps manifest and offline accents consistent without changing dark launch backgrounds', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
    expect(manifest.theme_color).toBe('#00f6ff');
    expect(manifest.background_color).toBe('#0b0e14');
    const offline = readFileSync('public/offline.html', 'utf8');
    expect(offline.match(/name="theme-color"/g)).toHaveLength(1);
    expect(offline).toContain('name="theme-color" content="#00f6ff"');
  });
});
