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
  scope,
  `${scope}/access`,
  `${scope}/entries`,
  `${entry}/rounds`,
  `${scope}/rounds/${roundId}/rating/me`,
  aggregate,
];

describe('contextual ranking reads', () => {
  it.each(contextualReads)('allows exact contextual methods: %s', (path) => {
    expect(allowedApiPath(path, 'GET')).toBe(true);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
      expect(allowedApiPath(path, method)).toBe(
        path.endsWith('/rating/me') && ['POST', 'PATCH'].includes(method),
      );
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

describe('contextual own rating writes', () => {
  const path = `${scope}/rounds/${roundId}/rating/me`;
  it.each(['POST', 'PATCH'])('permits exact %s only without query additions', (method) => {
    expect(allowedApiPath(path, method)).toBe(true);
    expect(allowedApiPath(path.replace('/rating/me', '/rating/another'), method)).toBe(false);
    expect(() =>
      assertRankingReadQuery(path, method, new URLSearchParams('actor=other')),
    ).toThrow();
  });
  it.each([
    ['POST', 400, 'ranking.invalid_rating'],
    ['PATCH', 400, 'ranking.invalid_rating'],
    ['POST', 404, 'ranking.not_found'],
    ['PATCH', 404, 'ranking.not_found'],
    ['POST', 409, 'ranking.rating_exists'],
    ['POST', 409, 'ranking.archived_read_only'],
    ['PATCH', 409, 'ranking.archived_read_only'],
  ])('exposes only exact known %s %s %s', async (method, status, code) => {
    respond(Number(status), { code, secret: 'never return' });
    await expect(upstreamRequest(path, { method: String(method) })).rejects.toMatchObject({
      status: Number(status),
      data: { code },
    });
  });
  it('does not leak unknown error or interpret PATCH duplicate as permission to recreate', async () => {
    respond(409, { code: 'ranking.rating_exists' });
    await expect(upstreamRequest(path, { method: 'PATCH' })).rejects.not.toHaveProperty('data');
  });
});

describe('private invitation address transport', () => {
  const read = '/user/ranking-invitation-address',
    rotate = `${read}/rotate`;
  it('allows only self read and explicit bodyless rotation', () => {
    expect(allowedApiPath(read, 'GET')).toBe(true);
    expect(allowedApiPath(rotate, 'POST')).toBe(true);
    for (const [path, method] of [
      [read, 'POST'],
      [rotate, 'GET'],
      [`${read}/other`, 'GET'],
    ])
      expect(allowedApiPath(path!, method!)).toBe(false);
    for (const path of [read, rotate])
      expect(() =>
        assertRankingReadQuery(
          path,
          path === read ? 'GET' : 'POST',
          new URLSearchParams('user_id=other'),
        ),
      ).toThrow();
    expect(() =>
      assertRankingReadQuery('/rankings', 'POST', new URLSearchParams('owner_id=other')),
    ).toThrow();
  });
  it.each([
    [read, 'GET'],
    [rotate, 'POST'],
  ])('preserves only exact safe unavailable code for %s', async (path, method) => {
    respond(503, { code: 'ranking.invitation_address_unavailable', secret: 'redacted' });
    await expect(upstreamRequest(path!, { method: method! })).rejects.toMatchObject({
      status: 503,
      data: { code: 'ranking.invitation_address_unavailable' },
    });
  });
});

it('projects only valid private invitation address and rejects malformed rotation', async () => {
  const path = '/user/ranking-invitation-address';
  respond(200, { recipient_code: null, user_id: 'private' });
  expect(await upstreamRequest(path, { method: 'GET' })).toEqual({
    status: 200,
    data: { recipient_code: null },
  });
  respond(200, { recipient_code: 'aX-_AbCdefGhijkLMNopqA', private_profile: 'private' });
  expect(await upstreamRequest(`${path}/rotate`, { method: 'POST' })).toEqual({
    status: 200,
    data: { recipient_code: 'aX-_AbCdefGhijkLMNopqA' },
  });
  for (const code of [null, 'invalid', 10]) {
    respond(200, { recipient_code: code });
    await expect(upstreamRequest(`${path}/rotate`, { method: 'POST' })).rejects.toMatchObject({
      status: 502,
    });
  }
});
describe('private invitation inbox and acceptance', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const inbox = '/ranking-invitations/incoming',
    accept = `/rankings/${id}/invitations/${id}/accept`;
  it('only GET inbox and exact scoped POST accept, with bounded page params', () => {
    expect(allowedApiPath(inbox, 'GET')).toBe(true);
    expect(allowedApiPath(accept, 'POST')).toBe(true);
    expect(allowedApiPath(inbox, 'POST')).toBe(false);
    expect(allowedApiPath(accept, 'GET')).toBe(false);
    expect(() =>
      assertRankingReadQuery(inbox, 'GET', new URLSearchParams(`limit=20&after=${id}`)),
    ).not.toThrow();
    for (const query of ['limit=101', 'limit=20&limit=20', 'after=x', 'user_id=x'])
      expect(() => assertRankingReadQuery(inbox, 'GET', new URLSearchParams(query))).toThrow();
    expect(() =>
      assertRankingReadQuery(accept, 'POST', new URLSearchParams('user_id=x')),
    ).toThrow();
  });
  it('preserves exact safe semantic codes only', async () => {
    respond(400, { code: 'ranking.invalid_page', message: 'private' });
    await expect(upstreamRequest(inbox, { method: 'GET' })).rejects.toMatchObject({
      status: 400,
      data: { code: 'ranking.invalid_page' },
    });
    respond(404, { code: 'ranking.invitation_not_found', message: 'private' });
    await expect(upstreamRequest(accept, { method: 'POST' })).rejects.toMatchObject({
      status: 404,
      data: { code: 'ranking.invitation_not_found' },
    });
  });
});
it('inbox projects only authorized title, identifiers and expiry, never issuer/profile fields', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const row = {
    invite_id: id,
    ranking_id: id,
    ranking_name: '<script>literal</script>',
    expires_at: '2026-12-01T00:00:00Z',
  };
  respond(200, {
    items: [{ ...row, issuer: { email: 'private' }, capabilities: ['ADMIN'] }],
    next_cursor: null,
    secret: 'private',
  });
  expect(
    await upstreamRequest('/ranking-invitations/incoming?limit=20', { method: 'GET' }),
  ).toEqual({ status: 200, data: { items: [row], next_cursor: null } });
  respond(200, { items: [{ ...row, ranking_name: undefined }], next_cursor: null });
  await expect(
    upstreamRequest('/ranking-invitations/incoming', { method: 'GET' }),
  ).rejects.toMatchObject({ status: 502 });
});
