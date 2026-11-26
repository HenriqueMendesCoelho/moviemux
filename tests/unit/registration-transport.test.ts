import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const kit = vi.hoisted(() => ({
  session: vi.fn(),
  active: vi.fn(),
  revoke: vi.fn(),
  status: vi.fn(),
  config: {
    apiUpstream: 'http://127.0.0.1:18081/api',
    trustedOrigins: 'https://moviemux.test',
    turnstileSecret: 'fixture-secret',
    turnstileHostnames: 'moviemux.test',
    public: { turnstileEnabled: true, turnstileSiteKey: 'fixture-sitekey' },
  },
}));
vi.mock('nuxt/server', () => ({
  defineEventHandler: (h: unknown) => h,
  createError: (v: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(v.message), v),
  setResponseStatus: kit.status,
  useRuntimeConfig: () => kit.config,
}));
vi.mock('../../src/server/utils/session', () => ({
  readActiveSession: kit.session,
  isActiveSession: kit.active,
}));
vi.mock('../../src/server/utils/session-registry', () => ({ revokeSession: kit.revoke }));

import api from '../../src/server/api/[...path]';
import { allowedApiPath } from '../../src/server/utils/upstream';

const modePublic = '/public/registration-mode';
const modeAdmin = '/restricted/registration-mode';
const waitlist = '/public/registration-waitlist';
const signup = '/public/user';
const token = 'fixture-proof';
const jwt = 'fixture-session';
const email = 'Synthetic@example.test';
const json = { 'content-type': 'application/json' };
const invalid = { status: 400, data: { code: 'registration.invalid_request' } };
function request(
  path: string,
  method: string,
  body?: string | Uint8Array,
  headers: Record<string, string> = json,
  original?: string,
) {
  const raw = '/api' + path;
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return (api as unknown as (event: unknown) => Promise<unknown>)({
    url: new URL(raw, 'http://fixture.test'),
    req: {
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
    },
    node: { req: { url: raw, originalUrl: original } },
    res: { headers: new Headers() },
  });
}
function respond(status: number, body: string | null, action = 'registration_waitlist') {
  const fetch = vi.fn<(target: string | URL, options?: RequestInit) => Promise<Response>>(
    async (target) =>
      String(target) === 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
        ? Response.json({ success: true, action, hostname: 'moviemux.test' })
        : new Response(body, { status }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
const waitBody = JSON.stringify({ email, 'cf-turnstile-response': token });
beforeEach(() => {
  vi.resetAllMocks();
  kit.active.mockReturnValue(true);
  kit.session.mockResolvedValue({
    secure: { accessToken: jwt },
    user: { generation: 'fixture-generation', expiresAt: 100, roles: ['USER'] },
  });
});
afterEach(() => vi.unstubAllGlobals());
test('adds only exact public and admin registration paths and methods', () => {
  for (const [path, methods] of [
    [modePublic, ['GET']],
    [modeAdmin, ['GET', 'PUT']],
    [waitlist, ['POST']],
  ] as const) {
    for (const method of ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
      expect(allowedApiPath(path, method)).toBe((methods as readonly string[]).includes(method));
    for (const variation of [
      path + '/',
      path + '/other',
      '/rankings' + path,
      path.replace('registration', '%72egistration'),
    ])
      expect(allowedApiPath(variation, methods[0])).toBe(false);
  }
});
test.each(['INVITE_ONLY', 'WAITLIST', 'OPEN'])(
  'public mode exposes only the anonymous mode %s without reading or forwarding a session',
  async (mode) => {
    const remote = respond(200, JSON.stringify({ mode }));
    await expect(
      request(modePublic, 'GET', undefined, {
        cookie: 'browser-cookie',
        authorization: 'forged-bearer',
        'content-type': 'ignored',
      }),
    ).resolves.toEqual({ mode });
    expect(kit.session).not.toHaveBeenCalled();
    expect(remote).toHaveBeenCalledExactlyOnceWith(
      new URL('http://127.0.0.1:18081/api' + modePublic),
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        headers: { accept: 'application/json' },
      }),
    );
  },
);
test('restricted read/write use the session bearer and backend authority, not local claims', async () => {
  const remote = respond(200, '{"mode":"OPEN"}');
  await expect(request(modeAdmin, 'GET', undefined, { 'x-role': 'ADM' })).resolves.toEqual({
    mode: 'OPEN',
  });
  await expect(request(modeAdmin, 'PUT', '{"m\\u006fde":"OPEN"}')).resolves.toEqual({
    mode: 'OPEN',
  });
  expect(kit.session).toHaveBeenCalledTimes(2);
  expect(remote).toHaveBeenCalledWith(
    new URL('http://127.0.0.1:18081/api' + modeAdmin),
    expect.objectContaining({
      method: 'PUT',
      body: '{"mode":"OPEN"}',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + jwt,
        ...json,
      },
    }),
  );
  kit.session.mockRejectedValue({ status: 401 });
  remote.mockClear();
  await expect(request(modeAdmin, 'GET')).rejects.toMatchObject({ status: 401 });
  expect(remote).not.toHaveBeenCalled();
});
test('waitlist validates its separate challenge and only forwards email; returns exactly an empty 202', async () => {
  const remote = respond(202, null);
  await expect(
    request(waitlist, 'POST', waitBody, {
      ...json,
      cookie: 'session',
      authorization: 'fake-token',
    }),
  ).resolves.toBe('');
  expect(kit.session).not.toHaveBeenCalled();
  expect(kit.status).toHaveBeenCalledWith(expect.anything(), 202);
  expect(remote).toHaveBeenCalledTimes(2);
  expect(remote.mock.calls[0]![0]).toBe(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  );
  expect(String(remote.mock.calls[0]![1]?.body)).not.toContain(email);
  expect(remote.mock.calls[1]).toEqual([
    new URL('http://127.0.0.1:18081/api' + waitlist),
    expect.objectContaining({
      method: 'POST',
      redirect: 'manual',
      body: JSON.stringify({ email }),
      headers: { accept: 'application/json', ...json },
    }),
  ]);
});
test('a signup CAPTCHA cannot authorize waitlist and waitlist cannot authorize signup', async () => {
  const remote = respond(202, null, 'signup');
  await expect(request(waitlist, 'POST', waitBody)).rejects.toMatchObject({ status: 403 });
  expect(remote).toHaveBeenCalledTimes(1);
  const another = respond(200, '{}', 'registration_waitlist');
  await expect(
    request(
      signup,
      'POST',
      JSON.stringify({
        name: 'Fixture',
        email,
        password: 'Pass!111',
        'cf-turnstile-response': token,
      }),
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(another).toHaveBeenCalledTimes(1);
});
test('OPEN signup keeps the existing signup challenge and omits an absent code, without making a mode decision at the BFF', async () => {
  const remote = respond(200, '{}', 'signup');
  const body = { name: 'Fixture', email, password: 'Pass!111' };
  await expect(
    request(signup, 'POST', JSON.stringify({ ...body, 'cf-turnstile-response': token })),
  ).resolves.toEqual({});
  expect(remote).toHaveBeenCalledTimes(2);
  expect(remote.mock.calls[1]![1]?.body).toBe(JSON.stringify(body));
  expect(kit.session).not.toHaveBeenCalled();
  remote.mockClear();
  await request(
    signup,
    'POST',
    JSON.stringify({ ...body, invite_code: 'fixture-code', 'cf-turnstile-response': token }),
  );
  expect(remote.mock.calls[1]![1]?.body).toBe(
    JSON.stringify({ ...body, invite_code: 'fixture-code' }),
  );
});
test('fails closed on unexpected mode/receipt and never returns email, tokens, extra fields or wrong-mode updates', async () => {
  for (const response of [
    '{"mode":"OTHER"}',
    '{"mode":"OPEN","email":"secret"}',
    '{"mode":"OPEN","m\\u006fde":"WAITLIST"}',
    '{"mode":"OPEN"}{}',
  ]) {
    respond(200, response);
    await expect(request(modePublic, 'GET')).rejects.toMatchObject({ status: 502 });
  }
  respond(200, '{"mode":"INVITE_ONLY"}');
  await expect(request(modeAdmin, 'PUT', '{"mode":"OPEN"}')).rejects.toMatchObject({ status: 502 });
  for (const [status, body] of [
    [200, null],
    [201, null],
    [202, '{"email":"secret"}'],
  ] as const) {
    respond(status, body);
    await expect(request(waitlist, 'POST', waitBody)).rejects.toMatchObject({ status: 502 });
  }
});
test('rejects unexpected queries, mismatched raw paths and bodies for reads', async () => {
  const remote = respond(200, '{"mode":"WAITLIST"}');
  for (const [path, method, body] of [
    [modePublic, 'GET', undefined],
    [modeAdmin, 'GET', undefined],
    [modeAdmin, 'PUT', '{"mode":"OPEN"}'],
    [waitlist, 'POST', waitBody],
  ] as const) {
    await expect(request(path + '?', method, body)).rejects.toMatchObject(invalid);
    await expect(request(path + '?secret=not-forwarded', method, body)).rejects.toMatchObject(
      invalid,
    );
    await expect(
      request(path, method, body, json, '/api/invalid/../' + path.slice(1)),
    ).rejects.toMatchObject({ status: 404 });
  }
  await expect(request(modePublic, 'GET', '{}')).rejects.toMatchObject(invalid);
  await expect(
    request(modeAdmin, 'GET', undefined, { 'content-length': '1' }),
  ).rejects.toMatchObject(invalid);
  expect(remote).not.toHaveBeenCalled();
});
test('rejects malformed and extra fields, duplicate decoded keys and bounded input', async () => {
  const remote = respond(202, null);
  for (const body of [
    '{}',
    '{"email":null}',
    '{"email":true}',
    '{"email":"x","email":"y"}',
    '{"email":"x","e\\u006dail":"y"}',
    '{"email":"x","user":"secret"}',
    '{"email":"x","cf-turnstile-response":"one","cf-turnstile-response":"two"}',
    JSON.stringify({ email: 'a'.repeat(9000) }),
  ]) {
    await expect(request(waitlist, 'POST', body)).rejects.toMatchObject(invalid);
  }
  for (const body of [
    '{}',
    '{"mode":"open"}',
    '{"mode":"OPEN","mode":"WAITLIST"}',
    '{"mode":"OPEN","email":"secret"}',
    '{"mode":"OPEN"}{}',
  ])
    await expect(request(modeAdmin, 'PUT', body)).rejects.toMatchObject(invalid);
  await expect(
    request(waitlist, 'POST', waitBody, { 'content-type': 'application/x-www-form-urlencoded' }),
  ).rejects.toMatchObject(invalid);
  expect(remote).not.toHaveBeenCalled();
});
test('recognizes only scoped safe code and suppresses upstream messages or sensitive fields', async () => {
  for (const [status, code] of [
    [400, 'registration.invalid_request'],
    [409, 'registration.mode_changed'],
    [503, 'registration.unavailable'],
  ] as const) {
    respond(status, JSON.stringify({ code }));
    await expect(request(waitlist, 'POST', waitBody)).rejects.toMatchObject({
      status,
      data: { code },
    });
  }
  respond(400, '{"code":"registration.invalid_request","email":"secret"}');
  const error = await request(waitlist, 'POST', waitBody).catch((e: unknown) => e);
  expect(error).toMatchObject({ status: 400 });
  expect(error).not.toHaveProperty('data');
  expect(JSON.stringify(error)).not.toContain('secret');
  respond(409, '{"code":"registration.mode_changed"}', 'signup');
  await expect(
    request(
      signup,
      'POST',
      JSON.stringify({
        name: 'Fixture',
        email,
        password: 'Pass!111',
        'cf-turnstile-response': token,
      }),
    ),
  ).rejects.toMatchObject({ status: 409, data: { code: 'registration.mode_changed' } });
});

test('legacy signup invalid-invite responses preserve only the explicit safe code', async () => {
  const body = JSON.stringify({
    name: 'Fixture',
    email,
    password: 'Pass!111',
    'cf-turnstile-response': token,
  });
  respond(
    400,
    JSON.stringify({
      error: true,
      code: 'registration.invite_required',
      message: 'invite is not valid',
      status: 400,
    }),
    'signup',
  );
  const error = await request(signup, 'POST', body).catch((e: unknown) => e);
  expect(error).toMatchObject({ status: 400, data: { code: 'registration.invite_required' } });
  expect(JSON.stringify(error)).not.toContain('invite is not valid');
  respond(400, JSON.stringify({ code: 'registration.invite_required' }));
  const wrong = await request(waitlist, 'POST', waitBody).catch((e: unknown) => e);
  expect(wrong).toMatchObject({ status: 400 });
  expect(wrong).not.toHaveProperty('data');
});

const adminWaitlist = '/restricted/registration-waitlist';
const requestA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const requestB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const inviteRoute = adminWaitlist + '/' + requestA + '/invite';
const fixtureRow = {
  request_id: requestA,
  email,
  requested_at: '2026-11-26T14:00:12.123456789+00:00',
  status: 'PENDING',
};
const receipt = { request_id: requestA, status: 'GATEWAY_ACCEPTED', invite_code: 'KB-12345678' };
test('admin waitlist only exact list GET and contextual bodyless invite POST', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    expect(allowedApiPath(adminWaitlist, method)).toBe(method === 'GET');
    expect(allowedApiPath(inviteRoute, method)).toBe(method === 'POST');
  }
  for (const path of [
    inviteRoute + '/',
    inviteRoute.replace(requestA, requestA.toUpperCase()),
    inviteRoute.replace(requestA, 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa'),
    inviteRoute.replace('/invite', '/resend'),
  ])
    expect(allowedApiPath(path, 'POST')).toBe(false);
  const upstream = respond(200, JSON.stringify({ items: [fixtureRow], next_cursor: null }));
  await expect(request(adminWaitlist + '?limit=20', 'GET')).resolves.toEqual({
    items: [fixtureRow],
    next_cursor: null,
  });
  expect(upstream).toHaveBeenCalledExactlyOnceWith(
    new URL('http://127.0.0.1:18081/api' + adminWaitlist + '?limit=20'),
    expect.objectContaining({
      method: 'GET',
      headers: { accept: 'application/json', authorization: 'Bearer ' + jwt },
      body: undefined,
    }),
  );
  expect(kit.session).toHaveBeenCalledOnce();
});
test('admin invite forwards no body, query, or content-type and requires matching receipt', async () => {
  const upstream = respond(200, JSON.stringify(receipt));
  await expect(
    request(inviteRoute, 'POST', undefined, {
      'content-length': '0',
      'content-type': 'application/x-www-form-urlencoded',
    }),
  ).resolves.toEqual(receipt);
  expect(upstream).toHaveBeenCalledExactlyOnceWith(
    new URL('http://127.0.0.1:18081/api' + inviteRoute),
    expect.objectContaining({
      method: 'POST',
      headers: { accept: 'application/json', authorization: 'Bearer ' + jwt },
      body: undefined,
      redirect: 'manual',
    }),
  );
  expect(kit.session).toHaveBeenCalledOnce();
  kit.session.mockRejectedValue({ status: 401 });
  upstream.mockClear();
  await expect(request(inviteRoute, 'POST')).rejects.toMatchObject({ status: 401 });
  expect(upstream).not.toHaveBeenCalled();
});
test('admin waitlist page bounds, exact cursor and request bodyless enforced', async () => {
  const upstream = respond(200, JSON.stringify({ items: [], next_cursor: null }));
  for (const query of [
    '?',
    '?limit=0',
    '?limit=51',
    '?limit=01',
    '?limit=1&limit=2',
    '?after=' + requestA + '&after=' + requestB,
    '?after=' + requestA.toUpperCase(),
    '?%6cimit=20',
    '?limit=20&email=secret',
    '?after=invalid',
    '?limit=1&',
  ])
    await expect(request(adminWaitlist + query, 'GET')).rejects.toMatchObject(invalid);
  await expect(request(adminWaitlist, 'GET', '{}')).rejects.toMatchObject(invalid);
  for (const [suffix, body] of [
    ['?', undefined],
    ['?limit=20', undefined],
    ['', '{}'],
  ] as const)
    await expect(request(inviteRoute + suffix, 'POST', body)).rejects.toMatchObject(invalid);
  await expect(
    request(inviteRoute, 'POST', undefined, { 'content-length': '1' }),
  ).rejects.toMatchObject(invalid);
  expect(upstream).not.toHaveBeenCalled();
  await expect(request(adminWaitlist + '?after=' + requestA + '&limit=50', 'GET')).resolves.toEqual(
    { items: [], next_cursor: null },
  );
  expect(upstream).toHaveBeenCalledOnce();
});
test('admin roster preserves all authorized statuses but never reveals an invite code inside the list', async () => {
  for (const status of [
    'PENDING',
    'SENDING',
    'GATEWAY_ACCEPTED',
    'DELIVERY_FAILED',
    'DELIVERY_UNKNOWN',
    'DELIVERY_UNAVAILABLE',
    'REVOKED',
  ]) {
    const data = { items: [{ ...fixtureRow, status }], next_cursor: null };
    respond(200, JSON.stringify(data));
    await expect(request(adminWaitlist, 'GET')).resolves.toEqual(data);
  }
  const localized = { ...fixtureRow, email: '𐐀'.repeat(50) + '@example.invalid' };
  const unicodePage = { items: [localized], next_cursor: null };
  respond(200, JSON.stringify(unicodePage));
  await expect(request(adminWaitlist, 'GET')).resolves.toEqual(unicodePage);
  for (const row of [
    { ...fixtureRow, invite_code: 'KB-12345678' },
    { ...fixtureRow, email: 'bad\nexample.test' },
    { ...fixtureRow, requested_at: '2026-11-26' },
    { ...fixtureRow, status: 'UNKNOWN' },
  ]) {
    respond(200, JSON.stringify({ items: [row], next_cursor: null }));
    await expect(request(adminWaitlist, 'GET')).rejects.toMatchObject({ status: 502 });
  }
  respond(200, JSON.stringify({ items: [fixtureRow], next_cursor: requestB }));
  await expect(request(adminWaitlist + '?limit=1', 'GET')).rejects.toMatchObject({ status: 502 });
  respond(200, JSON.stringify({ items: [fixtureRow], next_cursor: requestA }));
  await expect(request(adminWaitlist + '?limit=1', 'GET')).resolves.toEqual({
    items: [fixtureRow],
    next_cursor: requestA,
  });
  respond(200, JSON.stringify({ items: [fixtureRow], next_cursor: null }));
  await expect(request(adminWaitlist + '?after=' + requestA, 'GET')).rejects.toMatchObject({
    status: 502,
  });
  respond(
    200,
    JSON.stringify({
      items: [fixtureRow, { ...fixtureRow, request_id: requestB }],
      next_cursor: null,
    }),
  );
  await expect(request(adminWaitlist + '?limit=1', 'GET')).rejects.toMatchObject({ status: 502 });
  respond(200, JSON.stringify({ items: [fixtureRow, fixtureRow], next_cursor: null }));
  await expect(request(adminWaitlist, 'GET')).rejects.toMatchObject({ status: 502 });
  respond(
    200,
    JSON.stringify({ items: [fixtureRow], next_cursor: null }).replace(
      '"status":"PENDING"',
      '"status":"REVOKED","status":"PENDING"',
    ),
  );
  await expect(request(adminWaitlist, 'GET')).rejects.toMatchObject({ status: 502 });
});
test('admin invite confirms only four explicit delivery outcomes, same request ID and bounded nonnull code', async () => {
  for (const status of [
    'GATEWAY_ACCEPTED',
    'DELIVERY_FAILED',
    'DELIVERY_UNKNOWN',
    'DELIVERY_UNAVAILABLE',
  ]) {
    const data = { ...receipt, status };
    respond(200, JSON.stringify(data));
    await expect(request(inviteRoute, 'POST')).resolves.toEqual(data);
  }
  for (const data of [
    { ...receipt, email },
    { ...receipt, request_id: requestB },
    { ...receipt, status: 'REVOKED' },
    { ...receipt, invite_code: null },
    { ...receipt, invite_code: 'KB-1234567' },
    { ...receipt, invite_code: 'KB-12345678\n' },
  ]) {
    respond(200, JSON.stringify(data));
    await expect(request(inviteRoute, 'POST')).rejects.toMatchObject({ status: 502 });
  }
});
test('admin invite safe scoped conflicts only; no raw code/email on failure', async () => {
  for (const [status, code] of [
    [404, 'registration.request_not_found'],
    [409, 'registration.invitation_in_progress'],
    [409, 'registration.invitation_revoked'],
    [503, 'registration.unavailable'],
  ] as const) {
    respond(status, JSON.stringify({ code }));
    await expect(request(inviteRoute, 'POST')).rejects.toMatchObject({ status, data: { code } });
  }
  respond(
    409,
    JSON.stringify({
      code: 'registration.invitation_in_progress',
      invite_code: receipt.invite_code,
      email,
    }),
  );
  const error = await request(inviteRoute, 'POST').catch((e: unknown) => e);
  expect(error).toMatchObject({ status: 409 });
  expect(error).not.toHaveProperty('data');
  expect(JSON.stringify(error)).not.toContain(receipt.invite_code);
});

test('a revoked session cannot receive a late sensitive admin receipt or roster', async () => {
  respond(200, JSON.stringify(receipt));
  kit.active.mockReturnValue(false);
  await expect(request(inviteRoute, 'POST')).rejects.toMatchObject({ status: 401 });
  respond(200, JSON.stringify({ items: [fixtureRow], next_cursor: null }));
  await expect(request(adminWaitlist, 'GET')).rejects.toMatchObject({ status: 401 });
});

test('a bodyless invite using Nitro empty POST stream reaches the current admin authority', async () => {
  const upstream = respond(200, JSON.stringify(receipt));
  for (const headers of [{}, { 'content-length': '0' }]) {
    await expect(request(inviteRoute, 'POST', new Uint8Array(0), headers)).resolves.toEqual(
      receipt,
    );
  }
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(upstream.mock.calls.every((call) => call[1]?.body === undefined)).toBe(true);
  const refused = respond(403, '{"code":"registration.forbidden"}');
  await expect(
    request(inviteRoute, 'POST', new Uint8Array(0), { 'content-length': '0' }),
  ).rejects.toMatchObject({ status: 403 });
  expect(refused).toHaveBeenCalledTimes(1);
});
