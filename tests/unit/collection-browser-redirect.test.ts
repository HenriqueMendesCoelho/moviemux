import { expect, test, vi } from 'vitest';
import type { H3Event } from 'h3';

vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  setResponseStatus: (event: { res: { status: number } }, status: number) => {
    event.res.status = status;
  },
  setResponseHeader: (event: { res: { headers: Headers } }, key: string, value: string) => {
    event.res.headers.set(key, value);
  },
}));
import redirect from '../../src/server/middleware/collection-browser-redirect';

const id = 'abcdefab-2222-4222-8222-222222222222';
const upper = id.toUpperCase();

function request(path: string, method: string) {
  const event = {
    url: new URL(path, 'https://preview.example'),
    node: { req: { url: path.split('#', 1)[0], method } },
    req: { method },
    res: { headers: new Headers(), status: 200 },
  };
  return { res: event.res, invoke: () => redirect(event as unknown as H3Event) };
}

test.each([
  ['/rankings', '/movies/collections'],
  [`/rankings/${upper}`, `/movies/collections/${id}`],
  [`/rankings/${id}/join`, `/movies/collections/${id}/join`],
  [`/public/rankings/${id}`, `/public/movies/collections/${id}`],
])('exact legacy GET %s redirects to %s', (oldPath, canonical) => {
  const { res, invoke } = request(`${oldPath}?from=//third.example&token=discard#legacy`, 'GET');
  expect(invoke()).toBe('');
  expect(res.status).toBe(307);
  // Literal empty fragment avoids automatic inheritance by the browser.
  expect(res.headers.get('location')).toBe(`${canonical}#`);
  expect(res.headers.get('cache-control')).toBe('no-store, private');
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
});

test.each(['HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'])(
  'does not redirect an HTTP %s',
  (method) => {
    const { res, invoke } = request(`/rankings/${id}/join`, method);
    expect(invoke()).toBe('');
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store, private');
    expect(res.headers.has('location')).toBe(false);
  },
);

test.each([
  '/rankings/',
  '/rankings/invalid',
  '/RANKINGS',
  '/movies/../rankings',
  '/movies/%2e%2e/rankings',
  '/rankings//',
  '/rankings/./',
  '/rankings%2f',
  '/rankings\\',
  'https://preview.example/rankings',
  `/rankings/${id}/join/`,
  `/rankings/${id}//join`,
  `/rankings/${id}/a/../join`,
  `/rankings/${id}/entries`,
  `/public/rankings/${id}/join`,
  `/public/rankings/${id}%0A`,
  `/api/rankings/${id}`,
  `/api/public/rankings/${id}`,
  `/movies/collections/${id}`,
  `/public/movies/collections/${id}`,
])('leaves non-alias path %s untouched', (path) => {
  const { res, invoke } = request(path, 'GET');
  expect(invoke()).toBeUndefined();
  expect(res.headers.has('location')).toBe(false);
});
