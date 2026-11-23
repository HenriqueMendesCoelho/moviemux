import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const auth = vi.hoisted(() => ({ session: vi.fn(), revoke: vi.fn() }));
vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  createError: (options: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(options.message), options),
  setResponseStatus: vi.fn(),
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));
vi.mock('../../src/server/utils/session', () => ({ readActiveSession: auth.session }));
vi.mock('../../src/server/utils/session-registry', () => ({ revokeSession: auth.revoke }));
vi.mock('../../src/server/utils/turnstile', () => ({
  protectedBody: vi.fn(),
  turnstileAction: vi.fn(),
}));
import api from '../../src/server/api/[...path]';
import { rankingRequestBody } from '../../src/server/utils/ranking-requests';
import {
  allowedApiPath,
  assertRankingReadQuery,
  upstreamRequest,
} from '../../src/server/utils/upstream';

const rank = 'abcdefab-2222-4222-8222-222222222222';
const entry = '11111111-1111-4111-8111-111111111111';
const round = '22222222-2222-4222-8222-222222222222';
const cmd = 'abcdefab-3333-4333-8333-333333333333';
const settings = `/rankings/${rank}/settings/rounds`;
const list = `/rankings/${rank}/entries/${entry}/rounds`;
const command = JSON.stringify({ command_id: cmd, description: null });
const receipt = `{"round_number":9223372036854775807,"round_id":"${round}"}`;
const enabled = '{"repeat_enabled":true}';
const json = 'application/json';
type Handler = (event: unknown) => Promise<unknown>;
function invoke(
  path: string,
  method: string,
  body?: string | Uint8Array,
  headers: Record<string, string> = {},
) {
  const url = new URL('http://site.test/api' + path);
  const req = new Request(url, { method, headers, body: body as BodyInit | undefined });
  // Nitro's native request headers can include framing metadata that browser-mode
  // Request strips from fixture construction.
  const fallbackGet = req.headers.get.bind(req.headers);
  vi.spyOn(req.headers, 'get').mockImplementation((name) =>
    Object.hasOwn(headers, name.toLowerCase()) ? headers[name.toLowerCase()]! : fallbackGet(name),
  );
  const event = { url, req, res: { headers: new Headers() } };
  return { result: (api as unknown as Handler)(event), response: event.res };
}
function respond(status: number, raw: string) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(
        async () => new Response(raw, { status, headers: { 'content-type': json } }),
      ),
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.session.mockResolvedValue({
    secure: { accessToken: 'synthetic' },
    user: { generation: 'a', expiresAt: 111 },
  });
});
afterEach(() => vi.unstubAllGlobals());
test('exact routes and methods, old list GET keeps normal pagination; noncanonical variants and HEAD denied', () => {
  for (const [path, allowed] of [
    [settings, ['GET', 'PUT']],
    [list, ['GET', 'POST']],
    [list + '/' + round, ['GET']],
  ] as const) {
    for (const method of ['GET', 'PUT', 'POST', 'HEAD', 'PATCH', 'DELETE', 'OPTIONS'])
      expect(allowedApiPath(path, method)).toBe((allowed as readonly string[]).includes(method));
    expect(allowedApiPath(path + '/', 'PUT')).toBe(false);
  }
  expect(allowedApiPath(settings.replace(rank, 'abc'), 'GET')).toBe(false);
  expect(allowedApiPath(settings.replace(rank, rank.replace('a', '%61')), 'GET')).toBe(false);
  expect(allowedApiPath('/public' + settings, 'GET')).toBe(false);
  expect(() =>
    assertRankingReadQuery(list, 'GET', new URLSearchParams('afterNumber=4&limit=10'), true),
  ).not.toThrow();
  expect(() =>
    assertRankingReadQuery(list + '/' + round, 'GET', new URLSearchParams(), true),
  ).toThrow();
});
test.each([
  [settings, 'GET', 'ranking.invalid_round_settings'],
  [settings, 'PUT', 'ranking.invalid_round_settings'],
  [list, 'POST', 'ranking.invalid_round_command'],
] as const)('bare and ordinary query rejected on %s %s', async (path, method, code) => {
  respond(200, enabled);
  for (const query of ['?', '?limit=1']) {
    await expect(invoke(path + query, method).result).rejects.toMatchObject({
      status: 400,
      data: { code },
    });
  }
  expect(fetch).not.toHaveBeenCalled();
});
test('authenticated settings GET bodyless, no type/body forwarded and invalid body metadata rejected', async () => {
  respond(200, enabled);
  expect(
    await invoke(settings, 'GET', undefined, {
      'content-length': '0',
      'content-type': 'text/plain',
      authorization: 'Bearer client-secret',
    }).result,
  ).toEqual({ repeat_enabled: true });
  expect(auth.session).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    new URL('http://127.0.0.1:18081/api' + settings),
    expect.objectContaining({
      method: 'GET',
      body: undefined,
      headers: { accept: json, authorization: 'Bearer synthetic' },
    }),
  );
  for (const headers of [{ 'content-length': '1' }, { 'transfer-encoding': 'chunked' }] as Record<
    string,
    string
  >[])
    await expect(invoke(settings, 'GET', undefined, headers).result).rejects.toMatchObject({
      status: 400,
      data: { code: 'ranking.invalid_round_settings' },
    });
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('missing session prevents upstream and does not synthesize setting authority', async () => {
  respond(200, enabled);
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(invoke(settings, 'GET').result).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  '{"repeat_enabled":1}',
  '{"repeat_enabled":"true"}',
  '{"repeat_enabled":true,"repeat_enabled":false}',
  '{"repeat_enabled":true,"repeat_ena\\u0062led":true}',
  '{"repeat_enabled":true,"owner":true}',
  '{"repeat_enabled":true}{}',
  '{"repeat_enabled":true,}',
  '[]',
  '{}',
])('reject invalid settings JSON %s', (body) => {
  expect(() => rankingRequestBody(settings, 'PUT', body, json)).toThrow(
    expect.objectContaining({ status: 400, data: { code: 'ranking.invalid_round_settings' } }),
  );
});
test.each([
  `{"command_id":"${cmd}","description":false}`,
  `{"command_id":"${cmd}","description":12}`,
  `{"command_id":"${cmd}","descr\\u0069ption":null,"description":null}`,
  `{"command_id":"${cmd}","command_id":"${cmd}"}`,
  `{"command_id":"${cmd}","actor":"forged"}`,
  `{"command_id":"${cmd}","description":"bad\\u0000value"}`,
  `{"command_id":"${cmd}","description":"\\ud800"}`,
  '{"command_id":"invalid"}',
  '{}',
])('reject invalid round command JSON %s', (body) => {
  expect(() => rankingRequestBody(list, 'POST', body, json)).toThrow(
    expect.objectContaining({ status: 400, data: { code: 'ranking.invalid_round_command' } }),
  );
});
test('canonical decoded description matches Java whitespace, UTF-16 and codepoint rules', () => {
  const req = (description?: string | null) =>
    rankingRequestBody(
      list,
      'POST',
      JSON.stringify({ command_id: cmd.toUpperCase(), description }),
      json,
    );
  expect(req()).toBe(command);
  expect(req(null)).toBe(command);
  expect(req('\u001c\u0085\u00a0')).toBe(command);
  expect(req('\u001d\u202f 🎬 quoted "x" \n mesmo  \n\u0085')).toBe(
    JSON.stringify({ command_id: cmd, description: '🎬 quoted "x" \n mesmo' }),
  );
  expect(req('\ufeff test \ufeff')).toBe(
    JSON.stringify({ command_id: cmd, description: '\ufeff test \ufeff' }),
  );
  expect(req('🎬'.repeat(240))).toContain('🎬');
  expect(() => req('🎬'.repeat(241))).toThrow();
  expect(() => rankingRequestBody(list, 'POST', command, 'text/plain')).toThrow(
    expect.objectContaining({ status: 415 }),
  );
});
test('handler bounds raw bytes and rejects malformed UTF8 instead of replacing it', async () => {
  respond(201, receipt);
  await expect(
    invoke(list, 'POST', 'x'.repeat(4097), { 'content-type': json }).result,
  ).rejects.toMatchObject({ status: 400, data: { code: 'ranking.invalid_round_command' } });
  const before = new TextEncoder().encode(`{"command_id":"${cmd}","description":"`);
  const after = new TextEncoder().encode('"}');
  const invalid = new Uint8Array([...before, 0xc3, 0x28, ...after]);
  await expect(
    invoke(list, 'POST', invalid, { 'content-type': json }).result,
  ).rejects.toMatchObject({ status: 400, data: { code: 'ranking.invalid_round_command' } });
  expect(fetch).not.toHaveBeenCalled();
});
test.each([201, 200])(
  'preserves %s and exact positive long receipt without Number coercion',
  async (status) => {
    respond(status, receipt);
    const { result, response } = invoke(
      list,
      'POST',
      JSON.stringify({ command_id: cmd, description: '\u0085 reason  ' }),
      { 'content-type': json },
    );
    expect(await result).toBe(`{"round_id":"${round}","round_number":9223372036854775807}`);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      new URL('http://127.0.0.1:18081/api' + list),
      expect.objectContaining({
        method: 'POST',
        headers: { accept: json, 'content-type': json, authorization: 'Bearer synthetic' },
        body: JSON.stringify({ command_id: cmd, description: 'reason' }),
      }),
    );
  },
);
test.each([
  `{"round_id":"${round}","round_number":0}`,
  `{"round_id":"${round}","round_number":-1}`,
  `{"round_id":"${round}","round_number":1.2}`,
  `{"round_id":"${round}","round_number":1e2}`,
  `{"round_id":"${round}","round_number":"1"}`,
  `{"round_id":"${round}","round_number":9223372036854775808}`,
  `{"round_id":"fake","round_number":1}`,
  `{"round_id":"${round}","round_number":1,"revealed":true}`,
  `{"round_id":"${round}","round_number":1,"round_number":1}`,
])('invalid exact response never confirms a new round %s', async (raw) => {
  respond(201, raw);
  await expect(upstreamRequest(list, { method: 'POST', body: command })).rejects.toMatchObject({
    status: 502,
  });
});
test('settings response verifies exact boolean and PUT receipt verifies requested value', async () => {
  respond(200, '{"repeat_enabled":false}');
  await expect(upstreamRequest(settings, { method: 'GET' })).resolves.toEqual({
    status: 200,
    data: { repeat_enabled: false },
  });
  await expect(upstreamRequest(settings, { method: 'PUT', body: enabled })).rejects.toMatchObject({
    status: 502,
  });
  respond(200, enabled);
  await expect(upstreamRequest(settings, { method: 'PUT', body: enabled })).resolves.toEqual({
    status: 200,
    data: { repeat_enabled: true },
  });
  for (const invalid of [
    '{"repeat_enabled":1}',
    '{"repeat_enabled":true,"owner":"private"}',
    '{"repeat_enabled":true,"repeat_enabled":true}',
  ]) {
    respond(200, invalid);
    await expect(upstreamRequest(settings, { method: 'GET' })).rejects.toMatchObject({
      status: 502,
    });
  }
});
test.each([
  [settings, 'GET', 400, 'ranking.invalid_round_settings'],
  [settings, 'PUT', 400, 'ranking.invalid_round_settings'],
  [settings, 'GET', 404, 'ranking.not_found'],
  [list, 'POST', 400, 'ranking.invalid_round_command'],
  [list, 'POST', 404, 'ranking.not_found'],
  [list, 'POST', 409, 'ranking.repeat_rounds_disabled'],
  [list, 'POST', 409, 'ranking.round_command_conflict'],
] as const)(
  'only exact allowlisted %s %s %s %s reaches caller',
  async (path, method, status, code) => {
    respond(status, JSON.stringify({ code }));
    await expect(upstreamRequest(path, { method })).rejects.toMatchObject({
      status,
      data: { code },
    });
  },
);
test('mismatch, upstream 500/old unsupported and extended replies fail closed', async () => {
  for (const [path, method, status, error] of [
    [settings, 'GET', 409, { code: 'ranking.repeat_rounds_disabled' }],
    [settings, 'PUT', 400, { code: 'ranking.invalid_round_command' }],
    [settings, 'GET', 404, { error: 'Legacy route unavailable' }],
    [list, 'POST', 409, { code: 'ranking.round_command_conflict', description: 'private' }],
    [list, 'POST', 500, { code: 'ranking.operation_failed' }],
  ] as const) {
    respond(status, JSON.stringify(error));
    const e = await upstreamRequest(path, { method }).catch((caught) => caught);
    expect(e).toMatchObject({ status: status === 500 ? 502 : status });
    expect(e.data).toBeUndefined();
    expect(JSON.stringify(e)).not.toContain('private');
  }
});
