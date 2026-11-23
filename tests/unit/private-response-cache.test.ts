import { expect, test, vi } from 'vitest';
vi.mock('h3', () => ({
  getRequestURL: (e: { path: string }) => new URL(e.path, 'http://localhost'),
  getRequestHeader: (e: { accept: string }, name: string) =>
    name === 'accept' ? e.accept : undefined,
  getResponseHeader: (e: { headers: Headers }, name: string) => e.headers.get(name),
  setResponseHeader: (e: { headers: Headers }, name: string, value: string) =>
    e.headers.set(name, value),
}));
import { protectPrivateResponse } from '../../src/server/utils/private-response-cache';
import type { H3Event } from 'h3';
test.each(['/api/rankings/missing', '/api/login', '/api/unknown'])(
  'restores private policy after error formatter for %s',
  (path) => {
    const e = {
      path,
      accept: 'application/json',
      headers: new Headers({ 'cache-control': 'no-cache', vary: 'Accept-Encoding' }),
    };
    protectPrivateResponse(e as unknown as H3Event);
    expect(e.headers.get('cache-control')).toBe('no-store, private');
    expect(e.headers.get('pragma')).toBe('no-cache');
    expect(e.headers.get('x-content-type-options')).toBe('nosniff');
    expect(e.headers.get('vary')).toBe('Accept-Encoding, Cookie');
    protectPrivateResponse(e as unknown as H3Event);
    expect(e.headers.get('vary')).toBe('Accept-Encoding, Cookie');
  },
);
test('protects private HTML without changing static assets or Engine.IO', () => {
  for (const [path, accept, expected] of [
    ['/rankings/missing', 'text/html', 'no-store, private'],
    ['/_nuxt/app.js', '*/*', 'public, max-age=3600'],
    ['/ws', 'text/html', 'public, max-age=3600'],
  ]) {
    const e = { path, accept, headers: new Headers({ 'cache-control': 'public, max-age=3600' }) };
    protectPrivateResponse(e as unknown as H3Event);
    expect(e.headers.get('cache-control')).toBe(expected);
  }
});
