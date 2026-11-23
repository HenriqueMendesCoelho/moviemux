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
const member = '8abcdefa-3333-4333-8333-333333333333';
const previous = '7abcdefa-4444-4444-8444-444444444444';
const listing = `/movies/collections/${rank}/members`;
const commandPath = `${listing}/by-membership/${member}/capabilities`;
const command = '{"capabilities":["READ","RATE_OWN"]}';
const row = { membership_id: member, display_name: null, capabilities: ['READ', 'RATE_OWN'] };
const page = { items: [row], next_cursor: null };
const json = { 'content-type': 'application/json' };
const badPage = { status: 400, data: { code: 'ranking.invalid_page' } };
const badGrant = { status: 400, data: { code: 'ranking.invalid_capabilities' } };

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
  return (api as unknown as (e: unknown) => Promise<unknown>)(event);
}
function respond(status: number, raw?: string) {
  const fetch = vi.fn(async () => new Response(raw ?? null, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.session.mockResolvedValue({
    secure: { accessToken: 'synthetic' },
    user: { generation: 'g', expiresAt: 100 },
  });
});
afterEach(() => vi.unstubAllGlobals());

test.each(['/movies/collections', '/rankings'])(
  'exact private methods and original upstream alias %s',
  async (base) => {
    const list = `${base}/${rank}/members`;
    const put = `${list}/by-membership/${member}/capabilities`;
    for (const verb of ['GET', 'PUT', 'POST', 'HEAD', 'PATCH', 'DELETE', 'OPTIONS']) {
      expect(allowedApiPath(list, verb)).toBe(verb === 'GET');
      expect(allowedApiPath(put, verb)).toBe(verb === 'PUT');
    }
    for (const invalid of [
      `${list}/${member}/capabilities`,
      put + '/',
      '/public' + put,
      put.replace(member, member.toUpperCase()),
    ])
      expect(allowedApiPath(invalid, 'PUT')).toBe(false);
    expect(allowedApiPath('/public' + list, 'GET')).toBe(false);
    const get = respond(200, JSON.stringify(page));
    await expect(request(list, 'GET')).resolves.toEqual(page);
    expect(get).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${list}`),
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        redirect: 'manual',
        headers: { accept: 'application/json', authorization: 'Bearer synthetic' },
      }),
    );
    const save = respond(204);
    await expect(
      request(put, 'PUT', '{ "\\u0063apabilities" : ["READ","RATE_OWN","READ"] }'),
    ).resolves.toBeNull();
    expect(save).toHaveBeenCalledExactlyOnceWith(
      new URL(`http://127.0.0.1:18081/api${put}`),
      expect.objectContaining({
        method: 'PUT',
        body: command,
        redirect: 'manual',
      }),
    );
    expect(auth.session).toHaveBeenCalledTimes(2);
    expect(auth.status).toHaveBeenLastCalledWith(expect.anything(), 204);
  },
);
test('owner permission must come from backend; no fallback when roster is denied', async () => {
  const get = respond(404, '{"code":"ranking.not_found"}');
  await expect(request(listing, 'GET')).rejects.toMatchObject({
    status: 404,
    data: { code: 'ranking.not_found' },
  });
  expect(get).toHaveBeenCalledTimes(1);
});
test('pages by original raw handle; nulls and permissions survive projection', async () => {
  const exactPage = { items: [row], next_cursor: member };
  const query = `?after=${previous}&limit=01`;
  const get = respond(200, JSON.stringify(exactPage));
  await expect(request(listing + query, 'GET')).resolves.toEqual(exactPage);
  expect(get).toHaveBeenCalledExactlyOnceWith(
    new URL(`http://127.0.0.1:18081/api${listing}${query}`),
    expect.anything(),
  );
});
test.each([
  '?',
  '?limit=0',
  '?limit=51',
  '?limit=1.0',
  '?limit=1&limit=2',
  '?limit=12345678901',
  '?limit=%31',
  '?%6cimit=1',
  '?limit=1&',
  '?after=' + previous.toUpperCase(),
  '?after=' + previous + '&after=' + previous,
  '?account_id=' + member,
])('invalid raw paging never reaches upstream %s', async (query) => {
  const fetch = respond(200, JSON.stringify(page));
  await expect(request(listing + query, 'GET')).rejects.toMatchObject(badPage);
  expect(fetch).not.toHaveBeenCalled();
});
test('GET body and malformed raw target/query fail closed before fetch', async () => {
  const fetch = respond(200, JSON.stringify(page));
  await expect(request(listing, 'GET', '{}')).rejects.toMatchObject(badPage);
  await expect(
    request(listing, 'GET', undefined, { 'transfer-encoding': 'chunked' }),
  ).rejects.toMatchObject(badPage);
  await expect(request('/extra/%2e%2e' + listing, 'GET')).rejects.toMatchObject({ status: 404 });
  await expect(request(commandPath + '?', 'PUT', command)).rejects.toMatchObject(badGrant);
  await expect(
    request(commandPath, 'PUT', command, json, '/api' + commandPath + '?a=1'),
  ).rejects.toMatchObject(badGrant);
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(commandPath, 'PUT', command)).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  '',
  '{}',
  '{"capabilities":"READ"}',
  '{"capabilities":[null]}',
  '{"capabilities":[false]}',
  '{"capabilities":["read"]}',
  '{"capabilities":["ADM"]}',
  '{"capabilities":["READ"],"member_id":"extra"}',
  '{"capabilities":["READ"],"\\u0063apabilities":["RATE_OWN"]}',
  '{"capabilities":["READ",]}',
  command + '{}',
  command + '\u2028',
  command.padStart(16_385, ' '),
  JSON.stringify({ capabilities: Array(101).fill('READ') }),
  new Uint8Array([0xff]),
])('strict enum-array body fails closed before fetch: case %#', async (body) => {
  const fetch = respond(204);
  await expect(request(commandPath, 'PUT', body)).rejects.toMatchObject(badGrant);
  expect(fetch).not.toHaveBeenCalled();
});
test('handles [] revocation, 100 inputs, exact 16KiB bound and strict media type', async () => {
  const fetch = respond(204);
  await expect(request(commandPath, 'PUT', '{"capabilities":[]}')).resolves.toBeNull();
  expect(fetch).toHaveBeenLastCalledWith(
    expect.any(URL),
    expect.objectContaining({ body: '{"capabilities":[]}' }),
  );
  const hundred = JSON.stringify({ capabilities: Array(100).fill('READ') }).padStart(16_384, ' ');
  await expect(request(commandPath, 'PUT', hundred)).resolves.toBeNull();
  expect(fetch).toHaveBeenLastCalledWith(
    expect.any(URL),
    expect.objectContaining({ body: '{"capabilities":["READ"]}' }),
  );
  await expect(
    request(commandPath, 'PUT', command, { 'content-type': 'text/plain' }),
  ).rejects.toMatchObject(badGrant);
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('redacts mislabeled email/blank string and never falls back to another name', async () => {
  for (const name of ['private@example.invalid', '   ', null]) {
    respond(200, JSON.stringify({ ...page, items: [{ ...row, display_name: name }] }));
    await expect(request(listing, 'GET')).resolves.toEqual(page);
  }
  const exact = { ...page, items: [{ ...row, display_name: 'Visible' }] };
  respond(200, JSON.stringify(exact));
  await expect(request(listing, 'GET')).resolves.toEqual(exact);
});
test.each([
  JSON.stringify({ ...page, count: 1 }),
  JSON.stringify({ ...page, items: [{ ...row, user_id: member }] }),
  JSON.stringify({ ...page, items: [{ ...row, account_state: 'BLOCKED' }] }),
  JSON.stringify({ ...page, items: [{ ...row, capabilities: ['ADM'] }] }),
  JSON.stringify({ ...page, items: [{ ...row, capabilities: ['READ', 'READ'] }] }),
  JSON.stringify({ ...page, items: [row, row] }),
  JSON.stringify({ ...page, next_cursor: member }),
  JSON.stringify({ ...page, items: [{ ...row, membership_id: previous }] }),
  JSON.stringify(page).replace('"display_name":', '"display_name":"private","\\u0064isplay_name":'),
])('malformed/overdisclosing roster response fails closed: case %#', async (body) => {
  respond(200, body);
  await expect(request(listing + '?after=' + previous, 'GET')).rejects.toMatchObject({
    status: 502,
  });
});
test('requires exact empty 204, no synthesized grants', async () => {
  for (const [status, body] of [
    [200, '{}'],
    [201, ''],
  ] as const) {
    respond(status, body);
    await expect(request(commandPath, 'PUT', command)).rejects.toMatchObject({ status: 502 });
  }
});
test.each([
  ['GET', 400, 'ranking.invalid_page', 'ranking.invalid_page'],
  ['PUT', 400, 'ranking.invalid_capabilities', 'ranking.invalid_capabilities'],
  ['PUT', 400, 'ranking.invalid_page', undefined],
  ['PUT', 404, 'ranking.not_found', 'ranking.not_found'],
  ['GET', 404, 'ranking.not_found', 'ranking.not_found'],
  ['PUT', 409, 'ranking.owner_capabilities_immutable', undefined],
  ['PUT', 500, 'ranking.operation_failed', undefined],
] as const)(
  'allows only matching safe semantic errors %s %s %s',
  async (method, status, code, safe) => {
    respond(status, JSON.stringify({ code }));
    const error = await request(
      method === 'GET' ? listing : commandPath,
      method,
      method === 'PUT' ? command : undefined,
    ).catch((failure) => failure);
    expect(error.status).toBe(status === 500 ? 502 : status);
    expect(error.data?.code).toBe(safe);
    expect(error.message).toBe('API request failed');
  },
);
