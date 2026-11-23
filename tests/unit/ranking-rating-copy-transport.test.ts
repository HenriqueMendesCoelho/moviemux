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

const rid = 'abcdefab-2222-4222-8222-222222222222';
const eid = 'abcdefab-3333-4333-8333-333333333333';
const round = 'abcdefab-4444-4444-8444-444444444444';
const source = {
  ranking_id: 'abcdefab-5555-4555-8555-555555555555',
  entry_id: eid,
  round_id: round,
};
const token = 'Ab_-'.repeat(66);
const targetTail = `/${rid}/entries/${eid}/rounds/${round}/rating/me`;
const route = '/movies/collections' + targetTail;
const preview = route + '/copy-preview';
const apply = route + '/copy-apply';
const previewBody = JSON.stringify({ source });
const applyBody = JSON.stringify({ preview_token: token });
const expiry = '2026-11-23T01:02:03.123456789Z';
const ready = { status: 'READY', source_score: 0, preview_token: token, expires_at: expiry };
const receipt = { round_id: round, score: 0 };
const invalid = { status: 400, data: { code: 'ranking.invalid_rating_copy' } };
const json = { 'content-type': 'application/json' };

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
  const event = {
    url,
    req,
    node: { req: { url: raw, originalUrl: original } },
    res: { headers: new Headers() },
  };
  return { result: (api as unknown as (event: unknown) => Promise<unknown>)(event), event };
}
function respond(status: number, raw: string | null) {
  const fetch = vi.fn(async () => new Response(raw, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.session.mockResolvedValue({
    secure: { accessToken: 'synthetic-test-session' },
    user: { generation: 'a', expiresAt: 100 },
  });
});
afterEach(() => vi.unstubAllGlobals());

test.each(['/movies/collections', '/rankings'])(
  'same exact auth, DTO and method policy; never rewrites upstream alias %s',
  async (base) => {
    const p = base + targetTail + '/copy-preview';
    const a = base + targetTail + '/copy-apply';
    for (const path of [p, a]) {
      for (const method of ['POST', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
        expect(allowedApiPath(path, method)).toBe(method === 'POST');
      expect(allowedApiPath('/public' + path, 'POST')).toBe(false);
      expect(allowedApiPath(path + '/', 'POST')).toBe(false);
      expect(allowedApiPath(path.replace(rid, '%61' + rid.slice(1)), 'POST')).toBe(false);
    }
    const first = respond(200, JSON.stringify(ready));
    const upper = JSON.stringify({
      source: { ...source, ranking_id: source.ranking_id.toUpperCase() },
    });
    await expect(request(p, 'POST', upper).result).resolves.toEqual(ready);
    expect(first).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${p}`),
      expect.objectContaining({
        method: 'POST',
        body: previewBody,
        redirect: 'manual',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer synthetic-test-session',
          ...json,
        },
      }),
    );
    const second = respond(201, JSON.stringify(receipt));
    await expect(request(a, 'POST', applyBody).result).resolves.toEqual(receipt);
    expect(second).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${a}`),
      expect.objectContaining({ method: 'POST', body: applyBody, redirect: 'manual' }),
    );
    expect(auth.status).toHaveBeenLastCalledWith(expect.anything(), 201);
    expect(auth.session).toHaveBeenCalledTimes(2);
  },
);
test.each([
  '{}',
  '{"source":{}}',
  previewBody.replace('"source":', '"source":{},"\\u0073ource":'),
  previewBody.replace('"round_id":', '"round_id":"discard","\\u0072ound_id":'),
  previewBody.replace('"entry_id":', '"owner_id":'),
  previewBody.replace('"ranking_id":', '"account_id":"forged","ranking_id":'),
  previewBody.replace(source.ranking_id, 'not-a-uuid'),
  previewBody.replace(round, round + '\\n'),
  previewBody + '{}',
  previewBody + '\u2028',
  previewBody.padStart(1025, ' '),
  new Uint8Array([0xff]),
])('invalid preview body never reaches upstream: case %#', async (body) => {
  const fetch = respond(200, JSON.stringify(ready));
  await expect(request(preview, 'POST', body).result).rejects.toMatchObject(invalid);
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  '',
  '{"preview_token":null}',
  '{"preview_token":true}',
  applyBody.replace(token, token.slice(1)),
  applyBody.replace(token, token.slice(1) + '\\n'),
  applyBody.replace(token, token.slice(1) + '='),
  applyBody.replace('"preview_token":', '"score":0,"preview_token":'),
  applyBody.replace('"preview_token":', '"preview_token":"discard","\\u0070review_token":'),
  applyBody.padStart(2049, ' '),
])('invalid apply body never reaches upstream: case %#', async (body) => {
  const fetch = respond(201, JSON.stringify(receipt));
  await expect(request(apply, 'POST', body).result).rejects.toMatchObject(invalid);
  expect(fetch).not.toHaveBeenCalled();
});
test('the optional ASCII JSON whitespace, strict UTF8 bounds and exact escaped token work', async () => {
  const fetch = respond(201, JSON.stringify(receipt));
  const escaped = token
    .split('')
    .map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('');
  await expect(
    request(apply, 'POST', `{ "preview_token": "${escaped}" }`.padStart(2048, ' ')).result,
  ).resolves.toEqual(receipt);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    expect.any(URL),
    expect.objectContaining({ body: applyBody }),
  );
});
test('auth, raw path and bare/trailing query fail closed prior to fetch', async () => {
  const fetch = respond(200, JSON.stringify(ready));
  await expect(
    request(preview, 'POST', previewBody, { 'content-type': 'text/plain' }).result,
  ).rejects.toMatchObject(invalid);
  await expect(request('/x/%2e%2e' + preview, 'POST', previewBody).result).rejects.toMatchObject({
    status: 404,
  });
  await expect(request(preview + '?', 'POST', previewBody).result).rejects.toMatchObject(invalid);
  await expect(
    request(apply, 'POST', applyBody, json, '/api' + apply + '?another=1').result,
  ).rejects.toMatchObject(invalid);
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(apply, 'POST', applyBody).result).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each(['SOURCE_INELIGIBLE', 'DESTINATION_EXISTS'])(
  'exact blocked state exposes no own score/token/date: %s',
  async (status) => {
    const blocked = { status, source_score: null, preview_token: null, expires_at: null };
    respond(200, JSON.stringify(blocked));
    await expect(request(preview, 'POST', previewBody).result).resolves.toEqual(blocked);
  },
);
test.each([
  { ...ready, source_score: 11 },
  { ...ready, source_score: null },
  { ...ready, expires_at: '2026-02-31T10:00:00.000Z' },
  { ...ready, expires_at: '2026-11-23T01:02:03+00:00' },
  { ...ready, status: 'SOURCE_INELIGIBLE' },
  { ...ready, preview_token: token.slice(1) + '\n' },
  { ...ready, author_id: 'other' },
])('rejects invalid/peer preview receipt without returning its body: case %#', async (body) => {
  respond(200, JSON.stringify(body));
  await expect(request(preview, 'POST', previewBody).result).rejects.toMatchObject({
    status: 502,
    message: 'Unconfirmed rating copy response',
  });
});
test.each([
  [200, JSON.stringify(receipt)],
  [201, JSON.stringify({ ...receipt, round_id: eid })],
  [201, JSON.stringify({ ...receipt, score: 11 })],
  [201, JSON.stringify({ ...receipt, preview_token: token })],
  [201, `{"round_id":"${round}","score":0,"\\u0073core":10}`],
  [201, `{"round_id":"${round}","score":0.0}`],
  [204, null],
])('rejects invalid apply confirmation: case %#', async (status, body) => {
  respond(status as number, body as string | null);
  await expect(request(apply, 'POST', applyBody).result).rejects.toMatchObject({
    status: 502,
    message: 'Unconfirmed rating copy response',
  });
});
test.each([
  [400, 'ranking.invalid_rating_copy', 'ranking.invalid_rating_copy'],
  [404, 'ranking.not_found', 'ranking.not_found'],
  [409, 'ranking.rating_copy_stale', 'ranking.rating_copy_stale'],
  [409, 'ranking.rating_exists', 'ranking.rating_exists'],
  [503, 'ranking.rating_copy_unavailable', 'ranking.rating_copy_unavailable'],
  [500, 'ranking.operation_failed', undefined],
  [400, 'ranking.not_found', undefined],
  [503, 'ranking.not_found', undefined],
] as const)('handles semantic errors without raw state: %s %s', async (status, code, forwarded) => {
  respond(status, JSON.stringify({ code }));
  const result = await request(apply, 'POST', applyBody).result.catch((error) => error);
  expect(result.status).toBe(status === 500 || (status === 503 && !forwarded) ? 502 : status);
  expect(result.data?.code).toBe(forwarded);
  expect(result.message).toBe('API request failed');
});
test('copy remains backend-off when unavailable and never leaks upstream error content', async () => {
  respond(503, '{"code":"ranking.rating_copy_unavailable"}');
  await expect(request(preview, 'POST', previewBody).result).rejects.toMatchObject({
    status: 503,
    data: { code: 'ranking.rating_copy_unavailable' },
  });
  respond(409, JSON.stringify({ code: 'ranking.rating_exists' }));
  const previewConflict = await request(preview, 'POST', previewBody).result.catch(
    (error) => error,
  );
  expect(previewConflict.data).toBeUndefined();
  respond(
    404,
    JSON.stringify({ code: 'ranking.not_found', preview_token: token, message: 'secret' }),
  );
  const denial = await request(apply, 'POST', applyBody).result.catch((error) => error);
  expect(denial.data).toBeUndefined();
  expect(denial.message).toBe('API request failed');
});
