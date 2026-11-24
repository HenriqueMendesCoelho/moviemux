import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const auth = vi.hoisted(() => ({
  session: vi.fn(),
  active: vi.fn(),
  mode: { value: true as unknown },
}));
vi.mock('nuxt/server', () => ({
  defineEventHandler: (h: unknown) => h,
  createError: (o: { status: number; message: string }) => Object.assign(new Error(o.message), o),
  setResponseStatus: vi.fn(),
  useRuntimeConfig: () => ({
    apiUpstream: 'http://127.0.0.1:18081/api',
    public: { legacyFilmHandoffEnabled: auth.mode.value },
  }),
}));
vi.mock('../../src/server/utils/session', () => ({
  readActiveSession: auth.session,
  isActiveSession: auth.active,
}));
vi.mock('../../src/server/utils/turnstile', () => ({
  protectedBody: vi.fn(),
  turnstileAction: vi.fn(),
}));
import api from '../../src/server/api/[...path]';
import { allowedApiPath } from '../../src/server/utils/upstream';
import { legacyFilmHandoffMode } from '../../src/core/legacy-film-handoff';
const id = 'aaaaaaaa-1111-4111-8111-111111111111';
const mapping = {
  ranking_id: 'bbbbbbbb-2222-4222-8222-222222222222',
  entry_id: 'cccccccc-3333-4333-8333-333333333333',
};
const fetch = vi.fn<typeof globalThis.fetch>();
function request(
  path: string,
  method = 'GET',
  headers = {},
  body: unknown = null,
  original?: string,
) {
  const raw = '/api' + path;
  const response = new Headers();
  const result = (api as unknown as (event: unknown) => Promise<unknown>)({
    url: new URL(raw, 'http://127.0.0.1'),
    req: { method, headers: new Headers(headers), body },
    node: { req: { url: raw, originalUrl: original } },
    res: { headers: response },
  });
  return { result, response };
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.mode.value = true;
  auth.session.mockResolvedValue({ secure: { accessToken: 'synthetic' } });
  auth.active.mockReturnValue(true);
  fetch.mockReset().mockResolvedValue(Response.json(mapping));
  vi.stubGlobal('fetch', fetch);
});
afterEach(() => vi.unstubAllGlobals());
test.each(['/movies/collections', '/rankings'])(
  'only strict authenticated no-store resolver GET for %s',
  async (base) => {
    const path = `${base}/legacy-film-links/${id}`;
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
      expect(allowedApiPath(path, method)).toBe(method === 'GET');
    const req = request(path);
    expect(await req.result).toEqual(mapping);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      new URL('http://127.0.0.1:18081/api' + path),
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        redirect: 'manual',
        headers: { accept: 'application/json', authorization: 'Bearer synthetic' },
      }),
    );
    expect(req.response.get('referrer-policy')).toBe('no-referrer');
  },
);
test.each([false, 'false', undefined, null, '', 'TRUE', 'active', 1, {}])(
  'setting %j never enables resolver',
  async (mode) => {
    auth.mode.value = mode;
    await expect(request(`/rankings/legacy-film-links/${id}`).result).rejects.toMatchObject({
      status: 404,
    });
    expect(fetch).not.toHaveBeenCalled();
  },
);
test('only explicit false preserves legacy and only explicit true enables handoff', () => {
  expect(legacyFilmHandoffMode(false)).toBe('off');
  expect(legacyFilmHandoffMode('false')).toBe('off');
  expect(legacyFilmHandoffMode(true)).toBe('on');
  expect(legacyFilmHandoffMode('true')).toBe('on');
  expect(legacyFilmHandoffMode('ACTIVE')).toBe('unavailable');
});
test.each(['?', '?x=1', '/', '/extra', '%2f', '#fragment'])(
  'rejects suffix %s without upstream',
  async (suffix) => {
    await expect(
      request(`/rankings/legacy-film-links/${id}${suffix}`).result,
    ).rejects.toMatchObject({ status: 404 });
    expect(fetch).not.toHaveBeenCalled();
  },
);
test.each([
  { purpose: 'prefetch' },
  { 'sec-purpose': 'prerender' },
  { 'content-length': '1' },
  { 'transfer-encoding': 'chunked' },
])('rejects speculative/body headers %j', async (headers) => {
  await expect(
    request(`/rankings/legacy-film-links/${id}`, 'GET', headers).result,
  ).rejects.toMatchObject({ status: 404 });
  expect(fetch).not.toHaveBeenCalled();
});
test('rejects raw normalization, body and missing session without upstream', async () => {
  const path = `/rankings/legacy-film-links/${id}`;
  await expect(
    request(path, 'GET', {}, null, '/api/rankings/./legacy-film-links/' + id).result,
  ).rejects.toMatchObject({ status: 404 });
  await expect(request(path, 'GET', {}, new ReadableStream()).result).rejects.toMatchObject({
    status: 404,
  });
  auth.session.mockRejectedValue(new Error('private account'));
  await expect(request(path).result).rejects.toMatchObject({ status: 404 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([401, 403, 404, 410, 503, 307, 201])(
  'status %s never infers ACTIVE or falls back',
  async (status) => {
    fetch.mockResolvedValue(Response.json(mapping, { status }));
    await expect(request(`/rankings/legacy-film-links/${id}`).result).rejects.toMatchObject({
      status: 404,
      message: 'Link unavailable',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
test.each([
  '{"ranking_id":"' + mapping.ranking_id + '","ranking_id":"' + mapping.ranking_id + '"}',
  JSON.stringify({ ...mapping, title: 'private' }),
  JSON.stringify({ ...mapping, entry_id: id.toUpperCase() }),
  ' '.repeat(257),
  '{invalid}',
])('rejects malformed, duplicate or expanded wire %s', async (raw) => {
  fetch.mockResolvedValue(new Response(raw));
  await expect(request(`/rankings/legacy-film-links/${id}`).result).rejects.toMatchObject({
    status: 404,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('logout while resolving suppresses result and never retries', async () => {
  fetch.mockImplementation(async () => {
    auth.active.mockReturnValue(false);
    return Response.json(mapping);
  });
  await expect(request(`/rankings/legacy-film-links/${id}`).result).rejects.toMatchObject({
    status: 404,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
