import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const auth = vi.hoisted(() => ({ session: vi.fn(), revoke: vi.fn(), status: vi.fn() }));
vi.mock('nuxt/server', () => ({
  defineEventHandler: (h: unknown) => h,
  createError: (v: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(v.message), v),
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
const route = '/restricted/movies/catalog/manual';
const token = 'synthetic-session';
const id = 'aaaaaaaa-1111-4111-8111-111111111111';
const movie = 'bbbbbbbb-2222-4222-8222-222222222222';
const input = {
  command_id: id,
  portuguese_title: ' \u001c Filme 🎬\u202f ',
  description: 'A\r\nB',
  genre_ids: [9007199254740991, 2],
  release_date: '2000-02-29',
  runtime: 999,
};
const normalized = {
  command_id: id,
  portuguese_title: 'Filme 🎬',
  english_title: null,
  original_title: null,
  director: null,
  description: 'A\r\nB',
  release_date: '2000-02-29',
  runtime: 999,
  genre_ids: [2, 9007199254740991],
};
const invalid = { status: 400, data: { code: 'catalog.invalid_manual_movie' } };
const media = { 'content-type': 'application/json' };
const command = JSON.stringify(input);
function request(
  path: string,
  method: string,
  body?: string | Uint8Array,
  headers: Record<string, string> = media,
  original?: string,
) {
  const raw = '/api' + path;
  const url = new URL(raw, 'http://fixture.test');
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const req = {
    method,
    headers: new Headers(headers),
    body: bytes
      ? new ReadableStream({
          start(c) {
            c.enqueue(bytes);
            c.close();
          },
        })
      : null,
  };
  return (api as unknown as (event: unknown) => Promise<unknown>)({
    url,
    req,
    node: { req: { url: raw, originalUrl: original } },
    res: { headers: new Headers() },
  });
}
function mock(status: number, body: string | null) {
  const fetch = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  vi.resetAllMocks();
  // No client/browser role grant is trusted. The upstream makes its own current check.
  auth.session.mockResolvedValue({
    secure: { accessToken: token },
    user: { generation: 'a', expiresAt: 100, roles: ['USER'] },
  });
});
afterEach(() => vi.unstubAllGlobals());

test('adds exactly one private GET/POST route; no new legacy or other namespace fallback', async () => {
  for (const method of ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
    expect(allowedApiPath(route, method)).toBe(['GET', 'POST'].includes(method));
  for (const path of [
    route + '/',
    route + '/anything',
    '/public' + route,
    '/rankings' + route,
    route.replace('manual', '%6danual'),
  ])
    expect(allowedApiPath(path, 'POST')).toBe(false);
  const get = mock(204, null);
  await expect(
    request(route, 'GET', undefined, { 'x-user-id': 'forged', 'x-role': 'ADM' }),
  ).resolves.toBeNull();
  expect(get).toHaveBeenCalledExactlyOnceWith(
    new URL('http://127.0.0.1:18081/api' + route),
    expect.objectContaining({
      method: 'GET',
      body: undefined,
      redirect: 'manual',
      headers: { accept: 'application/json', authorization: 'Bearer ' + token },
    }),
  );
  expect(auth.status).toHaveBeenLastCalledWith(expect.anything(), 204);
  for (const status of [201, 200]) {
    const post = mock(status, JSON.stringify({ movie_id: movie }));
    await expect(request(route, 'POST', command)).resolves.toEqual({ movie_id: movie });
    expect(post).toHaveBeenCalledExactlyOnceWith(
      new URL('http://127.0.0.1:18081/api' + route),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(normalized),
        headers: { accept: 'application/json', authorization: 'Bearer ' + token, ...media },
      }),
    );
    expect(auth.status).toHaveBeenLastCalledWith(expect.anything(), status);
  }
});
test('same command, equivalent omissions/nulls, sorted genre references and exact Java strip', async () => {
  const post = mock(200, JSON.stringify({ movie_id: movie }));
  const a = JSON.stringify({ command_id: id, english_title: '\u001c A\t', genre_ids: [10, 2] });
  const b = JSON.stringify({
    command_id: id,
    english_title: 'A',
    description: null,
    release_date: null,
    genre_ids: [2, 10],
  });
  await request(route, 'POST', a);
  await request(route, 'POST', b);
  expect(post).toHaveBeenCalledTimes(2);
  expect(
    post.mock.calls.map((call) => (call as unknown as [URL, { body: string }])[1].body),
  ).toEqual([
    JSON.stringify({
      ...normalized,
      portuguese_title: null,
      english_title: 'A',
      description: null,
      release_date: null,
      runtime: null,
      genre_ids: [2, 10],
    }),
    JSON.stringify({
      ...normalized,
      portuguese_title: null,
      english_title: 'A',
      description: null,
      release_date: null,
      runtime: null,
      genre_ids: [2, 10],
    }),
  ]);
});
test('bodyless proof, exact raw path/queries, media and session gate deny before upstream', async () => {
  const upstream = mock(204, null);
  await expect(request(route + '?', 'GET')).rejects.toMatchObject(invalid);
  await expect(request(route, 'GET', '{}')).rejects.toMatchObject(invalid);
  await expect(
    request(route, 'GET', undefined, { 'transfer-encoding': 'chunked' }),
  ).rejects.toMatchObject(invalid);
  await expect(
    request(route, 'POST', command, media, '/api' + route + '?next=ignored'),
  ).rejects.toMatchObject(invalid);
  await expect(request('/bad/%2e%2e' + route, 'POST', command)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    request(route, 'POST', command, { 'content-type': 'text/plain' }),
  ).rejects.toMatchObject(invalid);
  auth.session.mockRejectedValueOnce({ status: 401 });
  await expect(request(route, 'GET')).rejects.toMatchObject({ status: 401 });
  expect(upstream).not.toHaveBeenCalled();
});
test.each([
  '{}',
  '[]',
  'null',
  '',
  JSON.stringify({ command_id: id }),
  JSON.stringify({ ...input, command_id: id.toUpperCase() }),
  JSON.stringify({ ...input, command_id: id.replace('-4111-', '-1111-') }),
  JSON.stringify({ ...input, command_id: id.replace('-8111-', '-7111-') }),
  JSON.stringify({ ...input, director: ' ' }),
  JSON.stringify({ ...input, english_title: '\u00a0' }),
  JSON.stringify({ ...input, original_title: '🎬'.repeat(151) }),
  JSON.stringify({ ...input, description: '🎬'.repeat(4001) }),
  JSON.stringify({ ...input, description: 'A\tB' }),
  JSON.stringify({ ...input, description: 'A\ud800B' }),
  JSON.stringify({ ...input, director: 'A\nB' }),
  JSON.stringify({ ...input, release_date: '0000-01-01' }),
  JSON.stringify({ ...input, release_date: '1900-02-29' }),
  JSON.stringify({ ...input, release_date: '2020-01-01T00:00:00Z' }),
  JSON.stringify({ ...input, runtime: 0 }),
  JSON.stringify({ ...input, runtime: 1000 }),
  command.replace('"runtime":999', '"runtime":999.0'),
  command.replace('"runtime":999', '"runtime":1e1'),
  JSON.stringify({ ...input, genre_ids: null }),
  JSON.stringify({ ...input, genre_ids: [2, 2] }),
  JSON.stringify({ ...input, genre_ids: [0] }),
  JSON.stringify({ ...input, genre_ids: [9007199254740992] }),
  JSON.stringify({ ...input, genre_ids: Array.from({ length: 33 }, (_, i) => i + 1) }),
  command.replace('"genre_ids":', '"genre_ids":[],"\\u0067enre_ids":'),
  command.replace('"command_id":', '"command_id":"other","\\u0063ommand_id":'),
  JSON.stringify({ ...input, ranking_id: movie }),
  JSON.stringify({ ...input, tmdb_id: 123 }),
  JSON.stringify({ ...input, show_notes: false }),
  command + '{}',
  command + '\u2028',
  new Uint8Array([0xff]),
])('rejects strict-invalid or forbidden data before upstream %#', async (body) => {
  const post = mock(201, JSON.stringify({ movie_id: movie }));
  await expect(request(route, 'POST', body)).rejects.toMatchObject(invalid);
  expect(post).not.toHaveBeenCalled();
});
test('exact 32768 UTF8 bytes permit canonical body; one more byte never sends', async () => {
  const post = mock(201, JSON.stringify({ movie_id: movie }));
  const trim = 32768 - new TextEncoder().encode(command).length;
  const padded = ' '.repeat(trim) + command;
  await expect(request(route, 'POST', padded)).resolves.toEqual({ movie_id: movie });
  await expect(request(route, 'POST', ' ' + padded)).rejects.toMatchObject(invalid);
  expect(post).toHaveBeenCalledTimes(1);
});
test('proof admits only empty 204 and create admits only exact canonical 200/201 receipt', async () => {
  for (const [method, status, raw] of [
    ['GET', 200, '{}'],
    ['POST', 204, null],
    ['POST', 200, '{}'],
    ['POST', 201, JSON.stringify({ movie_id: movie, ranking_id: id })],
    ['POST', 201, JSON.stringify({ movie_id: movie.toUpperCase() })],
    ['POST', 201, `{"movie_id":"${movie}","\\u006dovie_id":"${id}"}`],
  ] as const) {
    mock(status, raw);
    await expect(
      request(route, method, method === 'POST' ? command : undefined),
    ).rejects.toMatchObject({ status: 502 });
  }
});
test.each([
  ['GET', 400, 'catalog.invalid_manual_movie', 'catalog.invalid_manual_movie'],
  ['POST', 400, 'catalog.invalid_manual_movie', 'catalog.invalid_manual_movie'],
  ['GET', 403, 'catalog.manual_forbidden', 'catalog.manual_forbidden'],
  ['POST', 403, 'catalog.manual_forbidden', 'catalog.manual_forbidden'],
  ['POST', 409, 'catalog.manual_command_conflict', 'catalog.manual_command_conflict'],
  ['GET', 409, 'catalog.manual_command_conflict', undefined],
  ['POST', 401, 'bad-token', undefined],
  ['POST', 500, 'catalog.operation_failed', undefined],
] as const)('no local ADM grant or raw error relay %s %s', async (method, status, code, safe) => {
  const upstream = mock(status, JSON.stringify({ code }));
  const e = await request(route, method, method === 'POST' ? command : undefined).catch((e) => e);
  expect(e.status).toBe(status >= 500 ? 502 : status);
  expect(e.data?.code).toBe(safe);
  expect(upstream).toHaveBeenCalledTimes(1);
});
test('legacy 410 is not borrowed by this exact endpoint', async () => {
  mock(403, '{"code":"catalog.manual_forbidden","email":"private@example.invalid"}');
  const e = await request(route, 'GET').catch((e) => e);
  expect(e.status).toBe(403);
  expect(e.data).toBeUndefined();
});
