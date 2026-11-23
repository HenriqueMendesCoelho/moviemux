import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  setResponseStatus: vi.fn(),
  createError: (options: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));

vi.mock('#auth-server', () => ({ getUserSession: vi.fn() }));

import { getUserSession } from '#auth-server';
import apiRoute from '../../src/server/api/[...path]';
import apiSecurity from '../../src/server/middleware/api-security';

import {
  allowedApiPath,
  assertRankingReadQuery,
  upstreamRequest,
} from '../../src/server/utils/upstream';

afterEach(() => vi.unstubAllGlobals());

function respond(status: number, body: unknown, raw = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(raw ? String(body) : JSON.stringify(body), { status })),
  );
}

const knownErrors = [
  ['/rankings', 'GET', 400, 'ranking.invalid_page'],
  ['/rankings?after=abc&limit=20', 'GET', 404, 'ranking.not_found'],
  ['/rankings/access?limit=20', 'GET', 400, 'ranking.invalid_page'],
  ['/rankings/access', 'GET', 404, 'ranking.not_found'],
  ['/rankings', 'POST', 400, 'ranking.invalid_creation'],
  ['/rankings', 'POST', 409, 'ranking.creation_limit_reached'],
  ['/rankings', 'POST', 503, 'ranking.creation_unavailable'],
] as const;

describe('ranking BFF route allowlist', () => {
  it.each([
    ['/rankings', 'GET'],
    ['/rankings', 'POST'],
    ['/rankings/access', 'GET'],
  ])('allows only verified %s %s', (path, method) => {
    expect(allowedApiPath(path, method)).toBe(true);
  });
  it.each([
    '/rankings/',
    '/rankings/access/',
    '/rankings/123',
    '/rankings/123/members',
    '/rankings/access/123',
    '/rankings/public',
    '/public/rankings',
    '//rankings',
    '/rankings/../user',
    '/rankings%2faccess',
    '/rankings%252faccess',
    '/rankings\\access',
    '/rankings%5caccess',
    '/rankings%2e',
    '/RANKINGS',
    '/rankings?limit=20',
    '/rankings#access',
    '/rankings\n',
  ])('denies unimplemented or ambiguous pathname %s', (path) => {
    for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'])
      expect(allowedApiPath(path, method)).toBe(false);
  });
  it.each(['PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'get', 'post'])(
    'denies unsupported method %s',
    (method) => {
      expect(allowedApiPath('/rankings', method)).toBe(false);
      expect(allowedApiPath('/rankings/access', method)).toBe(false);
    },
  );
  it('does not allow writes to access projection', () => {
    expect(allowedApiPath('/rankings/access', 'POST')).toBe(false);
  });
});

describe('ranking error boundary', () => {
  it.each(knownErrors)('maps only verified %s %s %s %s', async (path, method, status, code) => {
    respond(status, {
      code,
      message: 'secret token',
      stack: 'private internals',
      data: { token: 'secret' },
    });
    const error = await upstreamRequest(path, { method }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status, message: 'API request failed', data: { code } });
    expect(JSON.stringify(error)).not.toContain('secret');
    expect(Object.keys((error as { data: object }).data)).toEqual(['code']);
  });
  it.each([
    ['/movie', 'POST', 503, 'ranking.creation_unavailable'],
    ['/rankings/access', 'POST', 503, 'ranking.creation_unavailable'],
    ['/rankings', 'GET', 503, 'ranking.creation_unavailable'],
    ['/rankings/', 'POST', 503, 'ranking.creation_unavailable'],
    ['/rankings/../rankings', 'POST', 503, 'ranking.creation_unavailable'],
    ['/rankings', 'POST', 400, 'ranking.invalid_page'],
    ['/rankings', 'GET', 400, 'ranking.invalid_creation'],
    ['/rankings', 'POST', 409, 'ranking.creation_unavailable'],
    ['/rankings', 'POST', 503, 'ranking.operation_failed'],
    ['/rankings', 'POST', 500, 'ranking.creation_unavailable'],
    ['/rankings', 'POST', 401, 'ranking.creation_unavailable'],
    ['/rankings', 'POST', 403, 'ranking.creation_unavailable'],
  ] as const)('rejects mismatched code %s %s %s %s', async (path, method, status, code) => {
    respond(status, { code, message: 'secret' });
    const error = await upstreamRequest(path, { method }).catch((caught: unknown) => caught);
    expect(error).toHaveProperty('status', [400, 401, 403, 409].includes(status) ? status : 502);
    expect(error).not.toHaveProperty('data');
    expect(JSON.stringify(error)).not.toContain(code);
    expect(JSON.stringify(error)).not.toContain('secret');
  });
  it.each([
    '<html>secret</html>',
    'null',
    '[]',
    '"ranking.creation_unavailable"',
    '{"code":42}',
    '{"code":{"secret":true}}',
    '{"code":"unknown.secret"}',
  ])('sanitizes malformed or unknown envelope %s', async (body) => {
    respond(503, body, true);
    await expect(upstreamRequest('/rankings', { method: 'POST' })).rejects.toMatchObject({
      status: 502,
      message: 'API request failed',
    });
  });
  it('preserves existing authenticated upstream request and successful response', async () => {
    const data = { items: [], nextCursor: null };
    respond(200, data);
    await expect(
      upstreamRequest('/rankings?limit=20', { method: 'GET', token: 'server-session-token' }),
    ).resolves.toEqual({ status: 200, data });
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:18081/api/rankings?limit=20'),
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        headers: { accept: 'application/json', authorization: 'Bearer server-session-token' },
      }),
    );
  });
});

const rankingId = 'b0000000-0000-4000-8000-000000000004';
const entryId = 'e0000000-0000-4000-8000-000000000001';
const roundId = 'a0000000-0000-4000-8000-000000000002';
const scope = `/rankings/${rankingId}`;
const entry = `${scope}/entries/${entryId}`;
const aggregate = `${entry}/ratings/aggregate`;
const contextualReads = [
  `${scope}/access`,
  `${scope}/entries`,
  `${entry}/rounds`,
  `${scope}/rounds/${roundId}/rating/me`,
  aggregate,
];

describe('contextual ranking reads', () => {
  it.each(contextualReads)('allows exact GET only: %s', (path) => {
    expect(allowedApiPath(path, 'GET')).toBe(true);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
      expect(allowedApiPath(path, method)).toBe(false);
    for (const invalid of [
      path + '/',
      path.replace(rankingId, 'wrong-id'),
      path + '/anything',
      path.replace('/rankings/', '/public/rankings/'),
      path.replace(rankingId, '%2e%2e'),
    ])
      expect(allowedApiPath(invalid, 'GET')).toBe(false);
  });
  it.each([
    [`${scope}/access`, 'after=anything'],
    [`${scope}/entries`, 'limit=21&limit=20'],
    [`${scope}/entries`, 'limit=101'],
    [`${scope}/entries`, 'rankingId=unexpected'],
    [`${scope}/entries`, 'after=not-a-uuid'],
    [`${entry}/rounds`, 'afterNumber=0'],
    [`${entry}/rounds`, 'afterNumber=9223372036854775808'],
    [`${entry}/rounds`, `after=${entryId}`],
    [aggregate, 'include_hidden=true'],
  ])('rejects ambiguous/uncontracted query for %s: %s', (path, query) => {
    expect(() => assertRankingReadQuery(path, 'GET', new URLSearchParams(query))).toThrow(
      'Invalid ranking query',
    );
  });
  it('allows documented bounded pagination without losing a long cursor', () => {
    expect(() =>
      assertRankingReadQuery(
        `${scope}/entries`,
        'GET',
        new URLSearchParams(`after=${entryId}&limit=20`),
      ),
    ).not.toThrow();
    expect(() =>
      assertRankingReadQuery(
        `${entry}/rounds`,
        'GET',
        new URLSearchParams('afterNumber=9223372036854775807&limit=100'),
      ),
    ).not.toThrow();
  });
  it.each(contextualReads)('preserves sanitized denial for %s', async (path) => {
    respond(404, { code: 'ranking.not_found', message: 'private upstream context' });
    await expect(upstreamRequest(path, { method: 'GET' })).rejects.toMatchObject({
      status: 404,
      message: 'API request failed',
      data: { code: 'ranking.not_found' },
    });
  });
});

const preciseAggregate = `{ "total" : -90071992547409931, "entry_id": "${entryId}", "votes": 9007199254740993, "partial": true }\n`;
describe('lossless successful aggregate transport', () => {
  it('preserves original signed total and vote tokens beyond 2^53', async () => {
    respond(200, preciseAggregate, true);
    await expect(upstreamRequest(aggregate, { method: 'GET' })).resolves.toEqual({
      status: 200,
      data: null,
      rawJson: preciseAggregate,
    });
  });
  it.each([
    preciseAggregate.replace(entryId, roundId),
    preciseAggregate.replace('true', 'null'),
    preciseAggregate.replace(': true', ': "true"'),
    preciseAggregate.replace('9007199254740993,', '-9007199254740993,'),
    preciseAggregate.replace('9007199254740993,', '9e18,'),
    preciseAggregate.replace('9007199254740993,', '"9007199254740993",'),
    preciseAggregate.replace('9007199254740993,', '9007199254740993.0,'),
    preciseAggregate.replace('"partial"', '"votes"'),
    preciseAggregate.replace('"partial": true', '"partial": true, "secret": "private"'),
    '<html>not JSON</html>',
  ])('rejects malformed, duplicate, wrong-context or extra aggregate fields', async (raw) => {
    respond(200, raw, true);
    await expect(upstreamRequest(aggregate, { method: 'GET' })).rejects.toMatchObject({
      status: 502,
      message: 'Invalid API response',
    });
  });
  it('does not enable raw JSON on unrelated requests', async () => {
    respond(200, preciseAggregate, true);
    const result = await upstreamRequest(`${scope}/entries`, { method: 'GET' });
    expect(result).not.toHaveProperty('rawJson');
  });
});

describe('ranking catch-all authenticated boundary', () => {
  const eventFor = (path: string) => {
    const url = new URL(`http://127.0.0.1/api${path}`);
    return { req: new Request(url), url, res: { headers: new Headers() }, context: {} };
  };
  it('sets the protected cache policy and sends aggregate JSON unquoted with exact integers', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      user: { generation: 'ranking-fixture-generation', expiresAt: Date.now() + 60_000 },
      secure: { accessToken: 'server-token' },
      csrfToken: 'fictional-nonce',
    } as never);
    respond(200, preciseAggregate, true);
    const event = eventFor(aggregate);
    await apiSecurity(event);
    await expect(apiRoute(event)).resolves.toBe(preciseAggregate);
    expect(event.res.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(event.res.headers.get('cache-control')).toBe('no-store, private');
    expect(event.res.headers.get('vary')).toContain('Cookie');
    expect(event.res.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('denies anonymous contextual reads without contacting the upstream', async () => {
    vi.mocked(getUserSession).mockResolvedValue({} as never);
    respond(200, preciseAggregate, true);
    await expect(apiRoute(eventFor(aggregate))).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
