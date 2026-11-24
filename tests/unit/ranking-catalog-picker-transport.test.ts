import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const auth = vi.hoisted(() => ({ session: vi.fn(), revoke: vi.fn(), status: vi.fn() }));
vi.mock('nuxt/server', () => ({
  defineEventHandler: (h: unknown) => h,
  createError: (v: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(v.message), v),
  setResponseStatus: auth.status,
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));
vi.mock('../../src/server/utils/session', () => ({ readActiveSession: auth.session }));
vi.mock('../../src/server/utils/session-registry', () => ({ revokeSession: auth.revoke }));
vi.mock('../../src/server/utils/turnstile', () => ({
  protectedBody: vi.fn(),
  turnstileAction: vi.fn(),
}));
import api from '../../src/server/api/[...path]';
import { allowedApiPath } from '../../src/server/utils/upstream';
const rid = 'aaaaaaaa-1111-4111-8111-111111111111';
const movie = 'bbbbbbbb-2222-4222-8222-222222222222';
const entry = 'cccccccc-3333-4333-8333-333333333333';
const route = `/movies/collections/${rid}/entries/catalog`;
const search = route + '/search';
const row = { movie_id: movie, title: 'Um filme manual', release_date: null };
const page = { items: [row], page: 1, has_more: false };
const idBody = JSON.stringify({ movie_id: movie });
const searchBody = JSON.stringify({ query: '_43% 🎬 &?', page: 1, language: 'pt-BR' });
const receipt = { entry_id: entry };
const json = { 'content-type': 'application/json' };
const invalidSearch = { status: 400, data: { code: 'ranking.invalid_catalog_search' } };
const invalidAttach = { status: 400, data: { code: 'ranking.invalid_catalog_entry' } };
function request(
  path: string,
  method: string,
  body?: string | Uint8Array,
  headers: Record<string, string> = json,
  original?: string,
) {
  const raw = '/api' + path;
  const url = new URL(raw, 'http://preview.test');
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const req = {
    method,
    headers: new Headers(headers),
    body: bytes
      ? new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        })
      : null,
  };
  return (api as unknown as (event: unknown) => Promise<unknown>)({
    url,
    req,
    node: { req: { url: raw, originalUrl: original } },
    res: { headers: new Headers() },
  });
}
function mock(status: number, raw: string | null) {
  const fetch = vi.fn(async () => new Response(raw, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.resetAllMocks();
  // BFF session proves identity only, never READ or ADD_ENTRY. No extra lookup.
  auth.session.mockResolvedValue({
    secure: { accessToken: 'synthetic' },
    user: { generation: 'a', expiresAt: 100 },
  });
});
afterEach(() => vi.unstubAllGlobals());
test.each(['/movies/collections', '/rankings'])(
  'exact private POST search and attach, same original upstream alias %s',
  async (base) => {
    const path = `${base}/${rid}/entries/catalog`;
    const anySearch = path + '/search';
    for (const method of ['POST', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      expect(allowedApiPath(path, method)).toBe(method === 'POST');
      expect(allowedApiPath(anySearch, method)).toBe(method === 'POST');
    }
    expect(allowedApiPath('/public' + anySearch, 'POST')).toBe(false);
    expect(allowedApiPath(anySearch + '/', 'POST')).toBe(false);
    expect(allowedApiPath(anySearch.replace(rid, '%61' + rid.slice(1)), 'POST')).toBe(false);
    const list = mock(200, JSON.stringify(page));
    await expect(request(anySearch, 'POST', searchBody)).resolves.toEqual(page);
    expect(list).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${anySearch}`),
      expect.objectContaining({
        method: 'POST',
        body: searchBody,
        redirect: 'manual',
        headers: { accept: 'application/json', authorization: 'Bearer synthetic', ...json },
      }),
    );
    for (const status of [200, 201]) {
      const add = mock(status, JSON.stringify(receipt));
      await expect(request(path, 'POST', idBody)).resolves.toEqual(receipt);
      expect(add).toHaveBeenCalledExactlyOnceWith(
        new URL(`http://127.0.0.1:18081/api${path}`),
        expect.objectContaining({ method: 'POST', body: idBody, redirect: 'manual' }),
      );
      expect(auth.status).toHaveBeenLastCalledWith(expect.anything(), status);
    }
  },
);
test('trim matches Java control-space/codepoint contract but preserves literal query data', async () => {
  const fetch = mock(200, JSON.stringify(page));
  const raw = JSON.stringify({ query: '\u001c _43% 🎬 &?\u202f\n', page: 1, language: 'pt-BR' });
  await expect(
    request(
      search,
      'POST',
      raw.padStart(8192 - (new TextEncoder().encode(raw).length - raw.length), ' '),
    ),
  ).resolves.toEqual(page);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    expect.any(URL),
    expect.objectContaining({ body: searchBody }),
  );
});
test.each([
  '{}',
  'null',
  searchBody.replace('"page":1', '"page":1.0'),
  searchBody.replace('"page":1', '"page":1e0'),
  searchBody.replace('"page":1', '"page":1,"\\u0070age":2'),
  searchBody.replace('"page":1', '"page":21'),
  searchBody.replace('"page":1', '"page":0'),
  searchBody.replace('pt-BR', 'en-GB'),
  searchBody.replace('"query":', '"token":"never","query":'),
  JSON.stringify({ query: '😀', page: 1, language: 'en-US' }),
  JSON.stringify({ query: '😀'.repeat(121), page: 1, language: 'en-US' }),
  JSON.stringify({ query: 'a\u0000b', page: 1, language: 'en-US' }),
  JSON.stringify({ query: 'a\u0085b', page: 1, language: 'en-US' }),
  JSON.stringify({ query: 'a\ud800b', page: 1, language: 'en-US' }),
  searchBody + '{}',
  searchBody + '\u2028',
  searchBody.padStart(8193, ' '),
  new Uint8Array([0xff]),
])('invalid search never forwards or falls back %#', async (raw) => {
  const upstream = mock(200, JSON.stringify(page));
  await expect(request(search, 'POST', raw)).rejects.toMatchObject(invalidSearch);
  expect(upstream).not.toHaveBeenCalled();
});
test.each([
  '{}',
  idBody.replace(movie, movie.toUpperCase()),
  idBody.replace(movie, 'not-a-uuid'),
  idBody.replace('"movie_id":', '"title":"never","movie_id":'),
  idBody.replace('"movie_id":', '"movie_id":"discard","\\u006dovie_id":'),
])('strict attach only accepts canonical movie_id %#', async (raw) => {
  const upstream = mock(201, JSON.stringify(receipt));
  await expect(request(route, 'POST', raw)).rejects.toMatchObject(invalidAttach);
  expect(upstream).not.toHaveBeenCalled();
});
test('method, raw query/path, session and media type reject before any upstream', async () => {
  const upstream = mock(200, JSON.stringify(page));
  await expect(request(search + '?', 'POST', searchBody)).rejects.toMatchObject(invalidSearch);
  await expect(request(route, 'POST', idBody, json, '/api' + route + '?q=x')).rejects.toMatchObject(
    invalidAttach,
  );
  await expect(request('/x/%2e%2e' + search, 'POST', searchBody)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    request(search, 'POST', searchBody, { 'content-type': 'text/plain' }),
  ).rejects.toMatchObject(invalidSearch);
  await expect(
    request(search.replace(rid, 'not-a-uuid'), 'POST', searchBody),
  ).rejects.toMatchObject(invalidSearch);
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(route.replace(rid, 'not-a-uuid'), 'POST', idBody)).rejects.toMatchObject({
    status: 401,
  });
  expect(upstream).not.toHaveBeenCalled();
});
test('exact 20 results with coherent pagination, date and unchanged display title', async () => {
  const items = Array.from({ length: 20 }, (_, i) => ({
    ...row,
    movie_id: `b0000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: ' Original title ',
    release_date: '2000-02-29',
  }));
  const response = { items, page: 19, has_more: true };
  mock(200, JSON.stringify(response));
  const body = JSON.stringify({ query: '😀'.repeat(120), page: 19, language: 'en-US' });
  await expect(request(search, 'POST', body)).resolves.toEqual(response);
});
test.each([
  { ...page, page: 2 },
  { ...page, has_more: true },
  { ...page, details: 'never' },
  { ...page, items: [row, row] },
  { ...page, items: [{ ...row, release_date: '2026-02-29' }] },
  { ...page, items: [{ ...row, release_date: '2026-01-01T00:00:00Z' }] },
  { ...page, items: [{ ...row, release_date: undefined }] },
  { ...page, items: [{ ...row, title: ' \u001c' }] },
  { ...page, items: [{ ...row, score: 10 }] },
  { ...page, items: [{ ...row, present: true }] },
  { ...page, items: [{ ...row, movie_id: movie.toUpperCase() }] },
])('unexpected or unsafe catalog result fails closed %#', async (data) => {
  mock(200, JSON.stringify(data));
  await expect(request(search, 'POST', searchBody)).rejects.toMatchObject({ status: 502 });
});
test('parser rejects duplicate scope fields and response receipts beyond allowed shape', async () => {
  mock(200, JSON.stringify(page).replace('"title":', '"title":"secret","\\u0074itle":'));
  await expect(request(search, 'POST', searchBody)).rejects.toMatchObject({ status: 502 });
  mock(201, JSON.stringify({ ...receipt, title: 'never' }));
  await expect(request(route, 'POST', idBody)).rejects.toMatchObject({ status: 502 });
  mock(204, null);
  await expect(request(route, 'POST', idBody)).rejects.toMatchObject({ status: 502 });
});
test.each([
  ['search', 400, 'ranking.invalid_catalog_search', 'ranking.invalid_catalog_search'],
  ['attach', 400, 'ranking.invalid_catalog_entry', 'ranking.invalid_catalog_entry'],
  ['search', 404, 'ranking.not_found', 'ranking.not_found'],
  ['attach', 409, 'ranking.archived_read_only', 'ranking.archived_read_only'],
  ['search', 409, 'ranking.archived_read_only', 'ranking.archived_read_only'],
  ['attach', 409, 'ranking.entry_recovery_expired', 'ranking.entry_recovery_expired'],
  ['search', 409, 'ranking.entry_recovery_expired', undefined],
  ['search', 500, 'ranking.operation_failed', undefined],
  ['attach', 503, 'ranking.tmdb_import_unavailable', undefined],
] as const)('only scoped safe status/code pairs %s %s %s', async (kind, status, code, safe) => {
  const upstream = mock(status, JSON.stringify({ code }));
  const e = await request(
    kind === 'search' ? search : route,
    'POST',
    kind === 'search' ? searchBody : idBody,
  ).catch((e) => e);
  expect(e.status).toBe(status >= 500 ? 502 : status);
  expect(e.data?.code).toBe(safe);
  expect(e.message).toBe('API request failed');
  expect(upstream).toHaveBeenCalledTimes(1);
});
