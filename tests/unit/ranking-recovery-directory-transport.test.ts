import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const auth = vi.hoisted(() => ({ session: vi.fn(), revoke: vi.fn(), status: vi.fn() }));
vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  createError: (value: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(value.message), value),
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
const rank = 'abcdefab-2222-4222-8222-222222222222';
const previous = '7fffffff-ffff-ffff-ffff-ffffffffffff';
const entry = '8fffffff-ffff-ffff-ffff-ffffffffffff';
const second = '9fffffff-ffff-ffff-ffff-ffffffffffff';
const base = `/movies/collections/${rank}/entries`;
const listing = base + '/recovery';
const restore = `${base}/${entry}/restore-current`;
const old = `/rankings/${rank}/entries`;
const version = '9223372036854775806';
const afterVersion = '9223372036854775807';
const command = JSON.stringify({ expected_version: version });
const instant = '2026-11-23T09:00:00.123456789Z';
const until = '2026-11-24T09:00:00.123456789Z';
const tombstone = { entry_id: entry, title: null, removed_at: instant, expires_at: until, version };
const page = { items: [tombstone], next_cursor: null };
const receipt = { entry_id: entry, version: afterVersion };
const error400 = { status: 400, data: { code: 'ranking.invalid_recovery_request' } };
const json = { 'content-type': 'application/json' };
function request(
  path: string,
  method: string,
  body?: string | Uint8Array,
  headers: Record<string, string> = json,
) {
  const rawUrl = '/api' + path;
  const url = new URL(rawUrl, 'http://preview.test');
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
  const event = { url, req, node: { req: { url: rawUrl } }, res: { headers: new Headers() } };
  return (api as unknown as (event: unknown) => Promise<unknown>)(event);
}
function respond(status: number, raw: string | null) {
  const fetch = vi.fn(async () => new Response(raw, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.session.mockResolvedValue({
    secure: { accessToken: 'synthetic' },
    user: { generation: 'a', expiresAt: 100 },
  });
});
afterEach(() => vi.unstubAllGlobals());

test.each([base, old])(
  'exact private list GET and tokenless restore POST preserve upstream path %s',
  async (path) => {
    const listPath = path + '/recovery';
    const restorePath = `${path}/${entry}/restore-current`;
    for (const verb of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
      expect(allowedApiPath(listPath, verb)).toBe(verb === 'GET');
      expect(allowedApiPath(restorePath, verb)).toBe(verb === 'POST');
    }
    expect(allowedApiPath('/public' + listPath, 'GET')).toBe(false);
    expect(allowedApiPath('/public' + restorePath, 'POST')).toBe(false);
    expect(allowedApiPath(restorePath.slice(0, -8), 'POST')).toBe(false);
    expect(allowedApiPath(listPath + '/', 'GET')).toBe(false);
    const fetch = respond(200, JSON.stringify(page));
    await expect(request(listPath, 'GET')).resolves.toEqual(page);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${listPath}`),
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        headers: {
          accept: 'application/json',
          authorization: 'Bearer synthetic',
        },
        redirect: 'manual',
      }),
    );
    const post = respond(200, JSON.stringify(receipt));
    await expect(
      request(restorePath, 'POST', ` { "\\u0065xpected_version" : "${version}" } `),
    ).resolves.toEqual(receipt);
    expect(post).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${restorePath}`),
      expect.objectContaining({ method: 'POST', body: command, redirect: 'manual' }),
    );
  },
);
test('preserves cursor order and null title exactly; no legacy metadata lookup', async () => {
  const cursorPage = { items: [tombstone], next_cursor: entry };
  const fetch = respond(200, JSON.stringify(cursorPage));
  const query = `?after=${previous.toUpperCase()}&limit=01`;
  await expect(request(listing + query, 'GET')).resolves.toEqual(cursorPage);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    new URL(`http://127.0.0.1:18081/api${listing}${query}`),
    expect.anything(),
  );
  respond(
    200,
    JSON.stringify({
      items: [{ ...tombstone, entry_id: second, title: 'Título' }],
      next_cursor: null,
    }),
  );
  await expect(request(listing + '?after=' + entry + '&limit=50', 'GET')).resolves.toMatchObject({
    items: [{ entry_id: second, title: 'Título', version }],
    next_cursor: null,
  });
});
test.each([
  '?',
  '?limit=0',
  '?limit=51',
  '?limit=1.0',
  '?limit=01&limit=2',
  '?%6cimit=1',
  '?limit=%31',
  '?limit=12345678901',
  '?limit=1&',
  '?bad=1',
  '?after=short',
  '?after=' + entry + '&after=' + previous,
])('rejects raw invalid query without sending it upstream: %s', async (query) => {
  const get = respond(200, JSON.stringify(page));
  await expect(request(listing + query, 'GET')).rejects.toMatchObject(error400);
  expect(get).not.toHaveBeenCalled();
});
test('blocks request bodies on directory, queries on restore and active-session failure', async () => {
  const fetch = respond(200, JSON.stringify(receipt));
  await expect(request(listing, 'GET', '{}')).rejects.toMatchObject(error400);
  await expect(
    request(listing, 'GET', undefined, { 'transfer-encoding': 'chunked' }),
  ).rejects.toMatchObject(error400);
  await expect(request(restore + '?', 'POST', command)).rejects.toMatchObject(error400);
  await expect(request(restore + '?limit=1', 'POST', command)).rejects.toMatchObject(error400);
  await expect(request('/x/%2e%2e' + listing, 'GET')).rejects.toMatchObject({ status: 404 });
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(listing, 'GET')).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  '{"expected_version":0}',
  '{"expected_version":null}',
  '{"expected_version":"01"}',
  '{"expected_version":"+1"}',
  '{"expected_version":"-1"}',
  '{"expected_version":" 1"}',
  '{"expected_version":"9223372036854775807"}',
  '{"expected_version":"9223372036854775808"}',
  '{"expected_version":"1","\\u0065xpected_version":"1"}',
  '{"expected_version":"1","removal_token":"not-allowed"}',
  command + ' {}',
  command.padStart(513, ' '),
  new Uint8Array([0xff]),
])('strict string version, no token or duplicate input: case %#', async (body) => {
  const post = respond(200, JSON.stringify(receipt));
  await expect(request(restore, 'POST', body)).rejects.toMatchObject(error400);
  expect(post).not.toHaveBeenCalled();
});
test.each([
  { ...page, counts: 1 },
  { ...page, items: [{ ...tombstone, removal_token: 'not-allowed' }] },
  { ...page, items: [{ ...tombstone, version: 123 }] },
  { ...page, items: [{ ...tombstone, version: '9223372036854775808' }] },
  { ...page, items: [{ ...tombstone, title: undefined }] },
  { ...page, items: [{ ...tombstone, expires_at: '2026-11-24T09:00:00.123456790Z' }] },
  { ...page, items: [{ ...tombstone, expires_at: '2026-11-24T09:00:00.123456789+00:00' }] },
  { ...page, items: [tombstone, tombstone] },
  { ...page, items: [{ ...tombstone, entry_id: second }, tombstone] },
  { ...page, next_cursor: entry },
  { ...page, next_cursor: 'not-a-uuid' },
  { ...page, items: [{ ...tombstone, entry_id: previous }] },
])('fail closed on malformed or overdisclosing directory response: case %#', async (bad) => {
  respond(200, JSON.stringify(bad));
  await expect(request(listing + '?after=' + previous, 'GET')).rejects.toMatchObject({
    status: 502,
  });
});
test.each([
  [201, JSON.stringify(receipt)],
  [204, null],
  [200, JSON.stringify({ ...receipt, version })],
  [200, JSON.stringify({ ...receipt, entry_id: second })],
  [200, JSON.stringify({ ...receipt, token: 'not-allowed' })],
  [200, JSON.stringify({ ...receipt, version: 42 })],
  [200, `{"entry_id":"${entry}","version":"1","\\u0076ersion":"${afterVersion}"}`],
])('requires exact scoped +1 string restore receipt: case %#', async (status, raw) => {
  respond(status as number, raw as string | null);
  await expect(request(restore, 'POST', command)).rejects.toMatchObject({ status: 502 });
});
test.each([
  [400, 'ranking.invalid_recovery_request', 'ranking.invalid_recovery_request'],
  [404, 'ranking.not_found', 'ranking.not_found'],
  [409, 'ranking.entry_state_stale', 'ranking.entry_state_stale'],
  [409, 'ranking.entry_recovery_expired', 'ranking.entry_recovery_expired'],
  [409, 'ranking.archived_read_only', 'ranking.archived_read_only'],
  [500, 'ranking.operation_failed', undefined],
  [404, 'ranking.entry_state_stale', undefined],
] as const)(
  'returns narrowly mapped errors without backend data: %s %s',
  async (status, code, allowed) => {
    respond(status, JSON.stringify({ code }));
    const failure = await request(restore, 'POST', command).catch((error) => error);
    expect(failure.status).toBe(status === 500 ? 502 : status);
    expect(failure.data?.code).toBe(allowed);
    expect(failure.message).toBe('API request failed');
  },
);

test.each([
  JSON.stringify(page).replace('"title":', '"title":"not-authorized","\\u0074itle":'),
  JSON.stringify(page).replace('"items":', '"items":[],"\\u0069tems":'),
])('duplicate list fields fail closed: case %#', async (raw) => {
  respond(200, raw);
  await expect(request(listing, 'GET')).rejects.toMatchObject({ status: 502 });
});

test('maximum backend page size accepts 50 strictly ordered rows and the exact cursor', async () => {
  const rows = Array.from({ length: 50 }, (_, i) => ({
    ...tombstone,
    entry_id: `8fffffff-ffff-ffff-ffff-${String(i).padStart(12, '0')}`,
  }));
  const largePage = { items: rows, next_cursor: rows[49]?.entry_id };
  respond(200, JSON.stringify(largePage));
  await expect(request(listing + '?limit=50', 'GET')).resolves.toEqual(largePage);
});
