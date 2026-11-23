import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { createEvent } from 'h3';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('nuxt/server', async () => ({
  createError: (await vi.importActual<typeof import('h3')>('h3')).createError,
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));

import handler from '../../src/server/api/public/rankings/[...publicRanking]';
import { publicRankingRequest } from '../../src/server/utils/public-ranking-transport';

const rank = 'abcdefab-2222-4222-8222-222222222222';
const next = 'cccccccc-2222-4222-8222-222222222222';
const path = `/api/public/rankings/${rank}`;
const backend = `http://127.0.0.1:18081/api/public/rankings/${rank}`;
const summary = JSON.stringify({ ranking_id: rank, ranking_name: null });
function upstream(status: number, raw: string, mime = 'application/json; charset=utf-8') {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(
        async () => new Response(raw, { status, headers: { 'content-type': mime } }),
      ),
  );
}
function invoke(method: string, url: string, headers: Record<string, string> = {}) {
  const request = new IncomingMessage(new Socket());
  request.method = method;
  request.url = url;
  request.headers = { host: 'example.test', ...headers };
  const response = new ServerResponse(request);
  return { result: handler(createEvent(request, response)), response };
}
function cached(response: ServerResponse) {
  expect(response.getHeader('cache-control')).toBe('no-store, private');
  expect(response.getHeader('pragma')).toBe('no-cache');
  expect(response.getHeader('x-content-type-options')).toBe('nosniff');
}
afterEach(() => vi.unstubAllGlobals());

test('anonymous handler preserves exact summary and never forwards request credentials or metadata', async () => {
  upstream(200, summary);
  const { result, response } = invoke('GET', path, {
    cookie: 'session=private',
    authorization: 'Bearer ignored',
    'x-actor-id': 'private',
    origin: 'https://irrelevant.test',
    'x-csrf-token': 'private',
  });
  expect(await result).toBe(summary);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    new URL(backend),
    expect.objectContaining({
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: { accept: 'application/json' },
    }),
  );
  expect((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body).toBeUndefined();
  expect(response.getHeader('content-type')).toBe('application/json; charset=utf-8');
  cached(response);
});
test.each(['HEAD', 'OPTIONS', 'POST', 'DELETE', 'get'])(
  'unsupported %s never aliases GET',
  async (method) => {
    upstream(200, summary);
    const { result, response } = invoke(method, path);
    await expect(result).rejects.toMatchObject({
      statusCode: 404,
      data: { code: 'ranking.not_found' },
    });
    expect(fetch).not.toHaveBeenCalled();
    cached(response);
  },
);
test.each([
  '/api/public/rankings',
  path + '/',
  path + '/rounds',
  path + '/entry',
  '/api/public/rankings/' + rank.toUpperCase(),
  path.replace('a', '%61'),
  path + '/entries/../',
  'http://elsewhere.test' + path,
  path + '#hash',
])('noncanonical or unimplemented path does not reach upstream %s', async (url) => {
  upstream(200, summary);
  await expect(invoke('GET', url).result).rejects.toMatchObject({ statusCode: 404 });
  expect(fetch).not.toHaveBeenCalled();
});
test('bounded default and exact canonical pagination, preserving large signed integer tokens', async () => {
  const big = '90071992547409931234567',
    votes = '90071992547409931234568';
  const raw = `{"items":[{"entry_id":"${next}","title":"Movie","total":-${big},"votes":${votes}}],"next_cursor":null}`;
  upstream(200, raw);
  const { result, response } = invoke('GET', path + '/entries?limit=1&after=' + rank);
  expect(await result).toBe(raw);
  cached(response);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    new URL(backend + '/entries?after=' + rank + '&limit=1'),
    expect.anything(),
  );
  expect(publicRankingRequest('GET', path + '/entries')).toMatchObject({
    limit: 20,
    after: null,
    malformed: false,
  });
  expect(publicRankingRequest('GET', path + '/entries?limit=50')).toMatchObject({
    limit: 50,
    malformed: false,
  });
});
test.each([
  '?',
  '?limit=0',
  '?limit=51',
  '?limit=01',
  '?limit=2&limit=2',
  '?limit=1.0',
  '?limit=2e0',
  '?limit=%31',
  '?after=' + rank.toUpperCase(),
  '?after=' + rank + '&after=' + rank,
  '?page=1',
  '?limit=1&',
  '?=1',
  '?limit=1=2',
])(
  'malformed public entries query %s only verifies safe public summary before 400',
  async (query) => {
    upstream(200, summary);
    const { result, response } = invoke('GET', path + '/entries' + query);
    await expect(result).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'ranking.invalid_page' },
    });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(new URL(backend), expect.anything());
    cached(response);
  },
);
test.each([
  ['summary?', '0', undefined],
  ['body', '1', undefined],
  ['body', undefined, 'chunked'],
] as const)('bare query and body fail closed %s', async (kind, length, encoding) => {
  upstream(200, summary);
  const headers: Record<string, string> = {};
  if (length) headers['content-length'] = length;
  if (encoding) headers['transfer-encoding'] = encoding;
  await expect(
    invoke('GET', path + (kind === 'summary?' ? '?' : ''), headers).result,
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(fetch).toHaveBeenCalledExactlyOnceWith(new URL(backend), expect.anything());
});
test('malformed query never confirms missing or private scope', async () => {
  upstream(404, '{"code":"ranking.not_found"}');
  const { result, response } = invoke('GET', path + '/entries?limit=51');
  await expect(result).rejects.toMatchObject({
    statusCode: 404,
    data: { code: 'ranking.not_found' },
  });
  expect(fetch).toHaveBeenCalledExactlyOnceWith(new URL(backend), expect.anything());
  cached(response);
});
test.each([
  `{"ranking_id":"${next}","ranking_name":"private"}`,
  `{"ranking_id":"${rank}","ranking_name":null,"owner":"private"}`,
  `{"ranking_id":"${rank}","ranking_name":null,"ranking_name":"private"}`,
  `{"ranking_id":"${rank}","ranking_name":null}{"other":"bad"}`,
])('rejects malformed or extended summary', async (raw) => {
  upstream(200, raw);
  await expect(invoke('GET', path).result).rejects.toMatchObject({ statusCode: 502 });
});
test.each([
  `{"items":[{"entry_id":"${next}","title":null,"total":0,"votes":0,"partial":true}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${next}","title":null,"total":0,"votes":1e2}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${next}","title":null,"total":0,"votes":-1}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${next}","title":null,"total":5,"votes":0}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${next}","title":null,"total":0,"votes":0}],"next_cursor":"${rank}"}`,
  `{"items":[{"entry_id":"${rank}","title":null,"total":0,"votes":0}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${next}","title":null,"total":0,"votes":0},{"entry_id":"${next}","title":null,"total":0,"votes":0}],"next_cursor":null}`,
])('fails closed on hidden, invalid or inconsistent page data', async (raw) => {
  upstream(200, raw);
  await expect(invoke('GET', path + '/entries?after=' + rank).result).rejects.toMatchObject({
    statusCode: 502,
  });
});
test('two identical disclosed zero projections remain identical regardless of viewer credentials', async () => {
  const raw = `{"items":[{"entry_id":"${next}","title":null,"total":0,"votes":0}],"next_cursor":"${next}"}`;
  upstream(200, raw);
  expect(await invoke('GET', path + '/entries?limit=1').result).toBe(raw);
  expect(await invoke('GET', path + '/entries?limit=1', { cookie: 'private' }).result).toBe(raw);
});
test.each([
  [400, 'ranking.invalid_page', 400],
  [404, 'ranking.not_found', 404],
  [404, 'ranking.invitation_not_found', 502],
  [403, 'ranking.not_found', 502],
  [500, 'ranking.operation_failed', 502],
  [302, 'ranking.not_found', 502],
] as const)('projects only safe status/code %s %s', async (status, code, expected) => {
  upstream(status, JSON.stringify({ code }));
  const result = await invoke('GET', path).result.catch((e) => e);
  expect(result).toMatchObject({ statusCode: expected });
  if (expected === 502) expect(result.data).toBeUndefined();
  else expect(result).toHaveProperty('data', { code });
});
test('stream cap and non-JSON upstream fail generically without exposing body', async () => {
  upstream(200, JSON.stringify({ ranking_id: rank, ranking_name: 'x'.repeat(300000) }));
  await expect(invoke('GET', path).result).rejects.toMatchObject({ statusCode: 502 });
  upstream(200, summary, 'text/html');
  await expect(invoke('GET', path).result).rejects.toMatchObject({ statusCode: 502 });
});
