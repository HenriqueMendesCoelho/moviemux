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
import { allowedApiPath, upstreamRequest } from '../../src/server/utils/upstream';

const id = 'abcdefab-2222-4222-8222-222222222222';
const canonical = `/movies/collections/${id}/settings/visibility`;
const legacy = `/rankings/${id}/settings/visibility`;
const pub = '{"visibility":"PUBLIC"}';
const secret = 'synthetic';
const invalid = { status: 400, data: { code: 'ranking.invalid_visibility_settings' } };
const json = { 'content-type': 'application/json' };

function request(
  path: string,
  method: string,
  body?: string | Uint8Array,
  headers: Record<string, string> = json,
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
    node: { req: { url: raw } },
    res: { headers: new Headers() },
  });
}

function respond(status: number, raw: string | null) {
  const fetch = vi.fn(async () => new Response(raw, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.session.mockResolvedValue({
    secure: { accessToken: secret },
    user: { generation: 'a', expiresAt: 100 },
  });
});
afterEach(() => vi.unstubAllGlobals());

test.each([canonical, legacy])('same exact authority and DTO policy for %s', async (path) => {
  for (const verb of ['GET', 'PUT', 'POST', 'HEAD', 'PATCH', 'DELETE', 'OPTIONS'])
    expect(allowedApiPath(path, verb)).toBe(verb === 'GET' || verb === 'PUT');
  for (const bad of [path + '/', path.replace(id, id.toUpperCase()), '/public' + path])
    expect(allowedApiPath(bad, 'GET')).toBe(false);
  const fetch = respond(200, pub);
  await expect(request(path, 'GET')).resolves.toEqual({ visibility: 'PUBLIC' });
  expect(fetch).toHaveBeenLastCalledWith(new URL(`http://127.0.0.1:18081/api${path}`), {
    method: 'GET',
    body: undefined,
    redirect: 'manual',
    signal: expect.anything(),
    headers: { accept: 'application/json', authorization: `Bearer ${secret}` },
  });
  await expect(request(path, 'PUT', '{ "\\u0076isibility" : "PUBLI\\u0043" }')).resolves.toEqual({
    visibility: 'PUBLIC',
  });
  expect(fetch).toHaveBeenLastCalledWith(
    new URL(`http://127.0.0.1:18081/api${path}`),
    expect.objectContaining({ method: 'PUT', body: pub }),
  );
  expect(auth.session).toHaveBeenCalledTimes(2);
  expect(auth.status).toHaveBeenLastCalledWith(expect.anything(), 200);
});

test.each([
  '',
  '{}',
  '{"visibility":"PUBLIC","visibility":"PUBLIC"}',
  '{"visibility":"PUBLIC","\\u0076isibility":"PRIVATE"}',
  '{"visibility":"PUBLIC","actor_id":"synthetic"}',
  '{"visibility":"PUBLIC",}',
  '{"visibility":"PUBLIC"}{}',
  '{"visibility":"PUBLIC"}\u2028',
  '{"visibility":"public"}',
  '{"visibility":true}',
  '{"visibility":null}',
  '[{"visibility":"PUBLIC"}]',
  pub.padStart(1025, ' '),
  new Uint8Array([0xff]),
])('rejects malformed input without calling upstream (%s)', async (body) => {
  const fetch = respond(200, pub);
  await expect(request(canonical, 'PUT', body)).rejects.toMatchObject(invalid);
  expect(fetch).not.toHaveBeenCalled();
});
test('boundary size, type, and scoped read framing are strict', async () => {
  const fetch = respond(200, pub);
  await expect(request(canonical, 'PUT', pub.padStart(1024, ' '))).resolves.toEqual({
    visibility: 'PUBLIC',
  });
  await expect(
    request(canonical, 'PUT', pub, { 'content-type': 'text/plain' }),
  ).rejects.toMatchObject(invalid);
  await expect(request(canonical, 'GET', pub)).rejects.toMatchObject(invalid);
  await expect(
    request(canonical, 'GET', undefined, { 'content-length': '2' }),
  ).rejects.toMatchObject(invalid);
  await expect(
    request(canonical, 'GET', undefined, { 'transfer-encoding': 'chunked' }),
  ).rejects.toMatchObject(invalid);
  expect(fetch).toHaveBeenCalledTimes(1);
});
test.each([canonical + '?', canonical + '?scope=other', legacy + '?after=a&after=b'])(
  'does not forward query %s',
  async (path) => {
    const fetch = respond(200, pub);
    await expect(request(path, 'GET')).rejects.toMatchObject(invalid);
    await expect(request(path, 'PUT', pub)).rejects.toMatchObject(invalid);
    expect(fetch).not.toHaveBeenCalled();
  },
);
test('rejects raw paths normalized into a valid endpoint', async () => {
  const fetch = respond(200, pub);
  await expect(request('/foo/..' + canonical, 'GET')).rejects.toMatchObject({ status: 404 });
  await expect(request('/foo/%2e%2e' + canonical, 'PUT', pub)).rejects.toMatchObject({
    status: 404,
  });
  expect(fetch).not.toHaveBeenCalled();
});
test('authentication is required before any visibility request reaches the upstream', async () => {
  const fetch = respond(200, pub);
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(canonical, 'GET')).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  [200, '{"visibility":"PUBLIC","owner":true}'],
  [200, '{"visibility":"PUBLIC","visibility":"PUBLIC"}'],
  [200, '{"visibility":"PRIVATE"}'],
  [201, pub],
  [204, null],
])('only matching exact 200 receipt settles a PUT (%s)', async (status, body) => {
  respond(status, body);
  await expect(request(canonical, 'PUT', pub)).rejects.toMatchObject({ status: 502 });
});
test.each([
  [400, '{"code":"ranking.invalid_visibility_settings"}', 'ranking.invalid_visibility_settings'],
  [404, '{"code":"ranking.not_found"}', 'ranking.not_found'],
  [400, '{"code":"ranking.not_found"}', undefined],
  [404, '{"code":"ranking.not_found","message":"secret"}', undefined],
  [404, '{"code":"ranking.not_found","code":"ranking.not_found"}', undefined],
  [500, '{"code":"ranking.not_found"}', undefined],
] as const)('never forwards raw errors: upstream %s', async (status, raw, code) => {
  respond(status, raw);
  const e = await upstreamRequest(canonical, { method: 'GET' }).catch((error) => error);
  expect(e.status).toBe(status === 500 ? 502 : status);
  expect(e.data?.code).toBe(code);
  expect(e.message).toBe('API request failed');
});
