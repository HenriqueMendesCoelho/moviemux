import { afterEach, expect, test, vi } from 'vitest';
vi.mock('nuxt/server', () => ({
  createError: (options: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));
import { rankingRequestBody } from '../../src/server/utils/ranking-requests';
import {
  allowedApiPath,
  assertRankingReadIntent,
  assertRankingReadQuery,
  upstreamRequest,
} from '../../src/server/utils/upstream';
import {
  publicRankingRequest,
  readPublicRanking,
} from '../../src/server/utils/public-ranking-transport';

const id = 'a0000000-0000-4000-8000-000000002001';
const entry = 'a0000000-0000-4000-8000-000000004001';
const summary = {
  ranking_id: id,
  name: 'Collection',
  admission: 'OPEN',
  visibility: 'PRIVATE',
  capabilities: ['READ'],
  can_share_open_link: true,
};
const canonical = '/movies/collections';
const old = '/rankings';
function mock(status: number, value: unknown) {
  const transport = vi.fn(
    async () =>
      new Response(value === null ? null : JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', transport);
  return transport;
}
afterEach(() => vi.unstubAllGlobals());

test.each([canonical, old])(
  'exposes the same strict operations and does not redirect %s',
  async (root) => {
    const list = root + '/' + id + '/entries/' + entry + '/rounds';
    expect(allowedApiPath(root, 'GET')).toBe(true);
    expect(allowedApiPath(root, 'POST')).toBe(true);
    expect(allowedApiPath(list, 'POST')).toBe(true);
    expect(allowedApiPath(list + '/' + entry, 'HEAD')).toBe(false);
    expect(allowedApiPath(root + '/' + id + '/settings/rounds', 'PUT')).toBe(true);
    expect(allowedApiPath(root + '/' + id + '/unexpected', 'POST')).toBe(false);
    expect(allowedApiPath(root + '/' + id + '/join', 'GET')).toBe(false);
    expect(() =>
      assertRankingReadIntent(
        list + '/' + entry,
        'GET',
        new Headers({ 'sec-purpose': 'prefetch' }),
      ),
    ).toThrow();
    expect(() =>
      assertRankingReadQuery(root + '/' + id + '/join', 'POST', new URLSearchParams('oops=1')),
    ).toThrow();
    expect(() =>
      rankingRequestBody(root + '/' + id + '/join', 'POST', '{}', 'application/json'),
    ).toThrow();
    const transport = mock(204, null);
    await expect(
      upstreamRequest(root + '/' + id + '/join', { method: 'POST', token: 'fake' }),
    ).resolves.toEqual({ status: 204, data: null });
    expect(transport).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:18081/api' + root + '/' + id + '/join'),
      expect.objectContaining({ method: 'POST', body: undefined, redirect: 'manual' }),
    );
    mock(200, { ...summary, unsafe: 'do not relay' });
    await expect(upstreamRequest(root + '/' + id, { method: 'GET' })).resolves.toEqual({
      status: 200,
      data: summary,
    });
  },
);

test.each(['/movies/collections/invitations/incoming', '/ranking-invitations/incoming'])(
  'incoming mailbox keeps strict cursor query, safe projection and namespace %s',
  async (path) => {
    expect(allowedApiPath(path, 'GET')).toBe(true);
    expect(allowedApiPath(path, 'POST')).toBe(false);
    expect(() =>
      assertRankingReadQuery(path, 'GET', new URLSearchParams('limit=20')),
    ).not.toThrow();
    expect(() => assertRankingReadQuery(path, 'GET', new URLSearchParams('actor=123'))).toThrow();
    const fetch = mock(200, { items: [], next_cursor: null, unsafe: true });
    await expect(
      upstreamRequest(path + '?limit=20', { method: 'GET', token: 'synthetic' }),
    ).resolves.toEqual({ status: 200, data: { items: [], next_cursor: null } });
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:18081/api' + path + '?limit=20'),
      expect.anything(),
    );
  },
);

test.each(['/public/movies/collections', '/public/rankings'])(
  'separately serves public %s without credentials',
  async (path) => {
    const projection = { ranking_id: id, ranking_name: 'Public collection' };
    const fetch = mock(200, projection);
    const request = publicRankingRequest('GET', '/api' + path + '/' + id);
    await expect(readPublicRanking(request, 'http://127.0.0.1:18081/api')).resolves.toBe(
      JSON.stringify(projection),
    );
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:18081/api' + path + '/' + id),
      expect.objectContaining({ method: 'GET', headers: { accept: 'application/json' } }),
    );
    expect(() => publicRankingRequest('HEAD', '/api' + path + '/' + id)).toThrow();
    expect(() => publicRankingRequest('GET', '/api' + path)).toThrow();
  },
);

test('does not create a TV namespace, a public directory or a new account address path', () => {
  expect(allowedApiPath('/tv/collections', 'GET')).toBe(false);
  expect(allowedApiPath('/movies/collections-admin', 'GET')).toBe(false);
  expect(allowedApiPath('/public/movies/collections/' + id, 'GET')).toBe(false);
  expect(allowedApiPath('/user/movie-collection-invitation-address', 'GET')).toBe(false);
  expect(allowedApiPath('/user/ranking-invitation-address', 'GET')).toBe(true);
});
