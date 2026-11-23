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
import { RECOVERY_WARNING } from '../../src/modules/ranking/utils/entryRecoveryContract';

const rid = 'abcdefab-2222-4222-8222-222222222222';
const eid = 'abcdefab-3333-4333-8333-333333333333';
const token = 'abcdefab-4444-4444-8444-444444444444';
const paths = [`/movies/collections/${rid}/entries/${eid}`, `/rankings/${rid}/entries/${eid}`];
const [canonical, legacy] = paths as [string, string];
const start = '2026-11-23T22:32:21.876543123-03:00';
const end = '2026-11-25T01:32:21.876543123Z';
const expected = 9223372036854775806n;
const data = `{"expected_version":${expected},"confirm":true}`;
const invalid = { status: 400, data: { code: 'ranking.invalid_recovery_request' } };
const json = { 'content-type': 'application/json' };
function receipt(
  version: bigint,
  removed: string | null,
  expires: string | null,
  recoveryToken: string | null,
) {
  return `{"entry_id":"${eid}","version":${version},"removed_at":${JSON.stringify(removed)},"expires_at":${JSON.stringify(expires)},"removal_token":${JSON.stringify(recoveryToken)},"warning_code":"${RECOVERY_WARNING}","recovery_seconds":86400}`;
}
const active = receipt(expected, null, null, null);
const removed = receipt(expected + 1n, start, end, token);
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
  return { result: (api as unknown as (event: unknown) => Promise<string>)(event), event };
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

test.each(paths)('allows exact preview GET and matching DELETE at %s only', async (path) => {
  for (const verb of ['GET', 'PUT', 'POST', 'HEAD', 'PATCH', 'DELETE', 'OPTIONS']) {
    expect(allowedApiPath(path, verb)).toBe(verb === 'DELETE');
    expect(allowedApiPath(path + '/removal-preview', verb)).toBe(verb === 'GET');
  }
  for (const wrong of [path + '/', '/public' + path, path.replace(eid, eid.toUpperCase())])
    expect(allowedApiPath(wrong, 'DELETE')).toBe(false);
  expect(allowedApiPath(path + '/restore', 'POST')).toBe(false);
  expect(allowedApiPath(path + '/restore-current', 'POST')).toBe(true);
  expect(allowedApiPath(path.replace(eid, 'recovery'), 'GET')).toBe(true);

  const get = respond(200, active);
  const preview = request(path + '/removal-preview', 'GET');
  const previewRaw = await preview.result;
  expect(previewRaw).toContain(`"version":${expected}`);
  expect(previewRaw).toContain('"removed_at":null');
  expect(previewRaw).not.toContain('removal_token');
  expect(get).toHaveBeenCalledExactlyOnceWith(
    new URL(`http://127.0.0.1:18081/api${path}/removal-preview`),
    expect.objectContaining({
      method: 'GET',
      body: undefined,
      redirect: 'manual',
      headers: { accept: 'application/json', authorization: 'Bearer synthetic' },
    }),
  );

  const remove = respond(200, removed);
  const deletion = request(
    path,
    'DELETE',
    ` { "confirm": true, "\\u0065xpected_version": ${expected} } `,
  );
  const deletedRaw = await deletion.result;
  expect(deletedRaw).toContain(`"version":${expected + 1n}`);
  expect(deletedRaw).toContain(end);
  expect(deletedRaw).not.toContain('removal_token');
  expect(deletedRaw).not.toContain(token);
  expect(remove).toHaveBeenCalledExactlyOnceWith(
    new URL(`http://127.0.0.1:18081/api${path}`),
    expect.objectContaining({ method: 'DELETE', body: data }),
  );
  expect(deletion.event.res.headers.get('content-type')).toContain('application/json');
});
test('preview can reconcile known removed entry with a token-free deadline', async () => {
  respond(200, removed);
  const raw = await request(canonical + '/removal-preview', 'GET').result;
  expect(raw).toContain(start);
  expect(raw).toContain(end);
  expect(raw).not.toContain(token);
});
test.each([
  '',
  '{}',
  '{"expected_version":0}',
  '{"expected_version":0,"confirm":false}',
  '{"expected_version":0,"confirm":"true"}',
  '{"expected_version":"0","confirm":true}',
  '{"expected_version":-0,"confirm":true}',
  '{"expected_version":01,"confirm":true}',
  '{"expected_version":1e0,"confirm":true}',
  '{"expected_version":1.0,"confirm":true}',
  '{"expected_version":9223372036854775807,"confirm":true}',
  '{"expected_version":9223372036854775808,"confirm":true}',
  '{"expected_version":0,"confirm":true,"actor":"forged"}',
  '{"expected_version":0,"confirm":true,"\\u0063onfirm":true}',
  '{"expected_version":0,"expected_version":2,"confirm":true}',
  '{"expected_version":0,"confirm":true,}',
  '{"expected_version":0,"confirm":true}{}',
  data + '\u2028',
  data.padStart(1025, ' '),
  new Uint8Array([0xff]),
])('malformed removal request never reaches upstream (%s)', async (body) => {
  const fetch = respond(200, removed);
  await expect(request(canonical, 'DELETE', body).result).rejects.toMatchObject(invalid);
  expect(fetch).not.toHaveBeenCalled();
});
test('raw shape, media type, GET framing and preauthorization are enforced', async () => {
  const fetch = respond(200, removed);
  await expect(
    request(canonical, 'DELETE', data, { 'content-type': 'text/plain' }).result,
  ).rejects.toMatchObject(invalid);
  await expect(request('/foo/..' + canonical, 'DELETE', data).result).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    request(canonical, 'DELETE', data, json, '/api' + canonical + '?').result,
  ).rejects.toMatchObject(invalid);
  await expect(request(canonical + '/removal-preview', 'GET', '{}').result).rejects.toMatchObject(
    invalid,
  );
  await expect(
    request(canonical + '/removal-preview', 'GET', undefined, { 'transfer-encoding': 'chunked' })
      .result,
  ).rejects.toMatchObject(invalid);
  await expect(request(canonical + '/removal-preview?', 'GET').result).rejects.toMatchObject(
    invalid,
  );
  await expect(request(legacy + '/removal-preview?a=1&a=2', 'GET').result).rejects.toMatchObject(
    invalid,
  );
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(canonical, 'DELETE', data).result).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  [201, removed],
  [204, null],
  [200, active],
  [200, removed.replace(eid, token)],
  [200, removed.replace(String(expected + 1n), String(expected))],
  [200, removed.replace(token, 'other')],
  [200, removed.replace(end, '2026-11-25T01:32:21.876543124Z')],
  [200, removed.replace(end, '2026-11-25T01:32:21.876543123-00:01')],
  [200, removed.replace(start, '2026-02-31T22:32:21.876543123-03:00')],
  [200, removed.replace('86400', '86401')],
  [200, removed.replace(RECOVERY_WARNING, 'not-a-warning')],
  [200, removed.replace('"removal_token":', '"notes":')],
  [200, removed.replace('"version":', '"version":1,"\\u0076ersion":')],
] as const)('fails closed on an unconfirmed DELETE receipt (%s)', async (status, raw) => {
  respond(status, raw);
  await expect(request(canonical, 'DELETE', data).result).rejects.toMatchObject({
    status: 502,
    message: 'Unconfirmed entry removal state',
  });
});
test.each([
  [400, 'ranking.invalid_recovery_request', 'ranking.invalid_recovery_request'],
  [404, 'ranking.not_found', 'ranking.not_found'],
  [409, 'ranking.archived_read_only', 'ranking.archived_read_only'],
  [409, 'ranking.entry_state_stale', 'ranking.entry_state_stale'],
  [409, 'ranking.entry_recovery_expired', undefined],
  [404, 'ranking.entry_state_stale', undefined],
  [500, 'ranking.operation_failed', undefined],
] as const)('sanitizes scoped backend error %s %s', async (status, code, forwarded) => {
  respond(status, JSON.stringify({ code }));
  const result = await request(canonical, 'DELETE', data).result.catch((error) => error);
  expect(result.status).toBe(status === 500 ? 502 : status);
  expect(result.data?.code).toBe(forwarded);
  expect(result.message).toBe('API request failed');
});
test('does not leak unexpected error fields or legacy tokens', async () => {
  respond(
    404,
    JSON.stringify({ code: 'ranking.not_found', removal_token: token, message: 'secret' }),
  );
  const error = await request(canonical + '/removal-preview', 'GET').result.catch((e) => e);
  expect(error.status).toBe(404);
  expect(error.data).toBeUndefined();
  expect(error.message).toBe('API request failed');
});
