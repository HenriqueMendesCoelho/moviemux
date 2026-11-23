import { afterEach, expect, test, vi } from 'vitest';
vi.mock('nuxt/server', () => ({
  createError: (options: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));
import { rankingRequestBody } from '../../src/server/utils/ranking-requests';
import {
  allowedApiPath,
  assertRankingReadQuery,
  upstreamRequest,
} from '../../src/server/utils/upstream';

const path = '/rankings/11111111-1111-4111-8111-111111111111/entries/tmdb';
const entry = '22222222-2222-4222-8222-222222222222';
const valid = JSON.stringify({ query: ' Film ', page: 1, language: 'pt-BR' });
const validItem = {
  tmdb_id: 17,
  title: 'Movie',
  original_title: null,
  release_date: '2024-02-29',
  poster_path: '/fixture.jpg',
};
function response(status: number, value: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(value), { status })),
  );
}
afterEach(() => vi.unstubAllGlobals());

test.each([path, path + '/search'])('exact POST only and no query for %s', (route) => {
  expect(allowedApiPath(route, 'POST')).toBe(true);
  for (const method of ['GET', 'HEAD', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])
    expect(allowedApiPath(route, method)).toBe(false);
  for (const bad of [
    route + '/',
    route + '?query=Movie',
    route + '/other',
    '/public' + route,
    route.replace('11111111', 'bad'),
  ]) {
    expect(allowedApiPath(bad, 'POST')).toBe(false);
  }
  expect(() =>
    assertRankingReadQuery(route, 'POST', new URLSearchParams('query=private')),
  ).toThrow();
  expect(() => assertRankingReadQuery(route, 'POST', new URLSearchParams())).not.toThrow();
});

test('validated search recognizes escaping while JSON fields/body are whitelisted', () => {
  const query = '  {hello}, "another movie" / ? & 💡  ';
  const body = JSON.stringify({ query, page: 20, language: 'en-US' });
  expect(rankingRequestBody(path + '/search', 'POST', body, 'application/json')).toBe(
    JSON.stringify({ query: query.trim(), page: 20, language: 'en-US' }),
  );
  expect(
    rankingRequestBody(path, 'POST', '{ "tmdb_id":9007199254740991 }', 'application/json'),
  ).toBe('{"tmdb_id":9007199254740991}');
  expect(() =>
    rankingRequestBody(path, 'POST', 'tmdb_id=1', 'application/x-www-form-urlencoded'),
  ).toThrow(expect.objectContaining({ status: 415 }));
});

test.each([
  '{"query":"Film","page":1.0,"language":"en-US"}',
  '{"query":"Film","page":1e0,"language":"en-US"}',
  '{"query":"Film","page":1,"pa\\u0067e":2,"language":"en-US"}',
  '{"query":"Film","page":1,"language":"en-US",}',
  '{"query":"Film","page":"1","language":"en-US"}',
  '{"query":"Film","page":21,"language":"pt-BR"}',
  '{"query":"Film","page":1,"language":"en"}',
  '{"query":"💡","page":1,"language":"en-US"}',
  '{"query":"Film","page":1,"language":"en-US","tmdb_id":2}',
])('rejects invalid search body %s', (body) => {
  expect(() => rankingRequestBody(path + '/search', 'POST', body, 'application/json')).toThrow(
    expect.objectContaining({ status: 400, data: { code: 'ranking.invalid_tmdb_search' } }),
  );
});

test.each([
  '{"tmdb_id":1.0}',
  '{"tmdb_id":1e0}',
  '{"tmdb_id":0}',
  '{"tmdb_id":-1}',
  '{"tmdb_id":"1"}',
  '{"tmdb_id":9007199254740992}',
  '{"tmdb_id":1,"tmdb_id":2}',
  '{"tmdb_id":1,"title":"Injection"}',
])('rejects invalid import body %s', (body) => {
  expect(() => rankingRequestBody(path, 'POST', body, 'application/json')).toThrow(
    expect.objectContaining({ status: 400, data: { code: 'ranking.invalid_tmdb_id' } }),
  );
});

test('search uses fixed destination body and projects only safe fields, never relays scores or overview', async () => {
  response(200, {
    items: [{ ...validItem, votes: 9, overview: 'private' }],
    page: 1,
    has_more: true,
    total: 2000,
  });
  const transit = await upstreamRequest(path + '/search', {
    method: 'POST',
    body: valid,
    contentType: 'application/json',
    token: 'synthetic',
  });
  expect(transit).toEqual({ status: 200, data: { items: [validItem], page: 1, has_more: true } });
  expect(fetch).toHaveBeenCalledWith(
    new URL('http://127.0.0.1:18081/api' + path + '/search'),
    expect.objectContaining({
      method: 'POST',
      body: valid,
      redirect: 'manual',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Bearer synthetic',
      },
    }),
  );
});

test.each([
  {
    items: [{ ...validItem, poster_path: 'https://elsewhere.invalid/a.jpg' }],
    page: 1,
    has_more: false,
  },
  { items: [{ ...validItem, title: '  ' }], page: 1, has_more: false },
  { items: [{ ...validItem, release_date: '2024-06-31' }], page: 1, has_more: false },
  { items: [validItem], page: 2, has_more: false },
  { items: [], page: 1, has_more: true },
])('fails closed on malformed result', async (data) => {
  response(200, data);
  await expect(
    upstreamRequest(path + '/search', { method: 'POST', body: valid }),
  ).rejects.toMatchObject({
    status: 502,
    data: { code: 'ranking.tmdb_invalid_response' },
  });
});

test.each([200, 201])('import exact status and sanitized UUID receipt %s', async (status) => {
  response(status, { entry_id: entry, actor: 'private' });
  await expect(upstreamRequest(path, { method: 'POST', body: '{"tmdb_id":17}' })).resolves.toEqual({
    status,
    data: { entry_id: entry },
  });
});

test.each([
  ['search', 400, 'ranking.invalid_tmdb_search'],
  ['search', 404, 'ranking.not_found'],
  ['search', 409, 'ranking.archived_read_only'],
  ['search', 502, 'ranking.tmdb_invalid_response'],
  ['search', 503, 'ranking.tmdb_import_unavailable'],
  ['search', 503, 'ranking.tmdb_unavailable'],
  ['import', 400, 'ranking.invalid_tmdb_id'],
  ['import', 404, 'ranking.tmdb_not_found'],
  ['import', 409, 'ranking.archived_read_only'],
  ['import', 409, 'ranking.entry_recovery_expired'],
  ['import', 409, 'ranking.catalog_identity_conflict'],
  ['import', 503, 'ranking.tmdb_import_unavailable'],
] as const)('only matching %s %s %s code is carried', async (operation, status, code) => {
  response(status, { code, error: 'private' });
  await expect(
    upstreamRequest(operation === 'search' ? path + '/search' : path, { method: 'POST' }),
  ).rejects.toMatchObject({ status, data: { code } });
});

test('unknown or mismatched provider code is generic', async () => {
  response(503, { code: 'ranking.invitation_address_unavailable', message: 'private' });
  await expect(upstreamRequest(path + '/search', { method: 'POST' })).rejects.toMatchObject({
    status: 502,
    message: 'API request failed',
  });
  response(404, { code: 'ranking.tmdb_not_found', message: 'private' });
  const err = await upstreamRequest(path + '/search', { method: 'POST' }).catch((error) => error);
  expect(err).not.toHaveProperty('data');
});

test('a malformed 201 import receipt stays uncertain, not a confirmed upstream provider rejection', async () => {
  response(201, { entry_id: 'invalid', message: 'private' });
  const failure = await upstreamRequest(path, { method: 'POST', body: '{"tmdb_id":17}' }).catch(
    (error) => error,
  );
  expect(failure).toMatchObject({ status: 502, message: 'Unconfirmed ranking import response' });
  expect(failure).not.toHaveProperty('data');
  expect(JSON.stringify(failure)).not.toContain('private');
});
