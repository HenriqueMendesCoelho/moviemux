import type { H3Event } from 'h3';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('nuxt/server', () => ({
  createError: (options: { status: number; message: string }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api/monolith' }),
}));
vi.mock('../../src/server/utils/session', () => ({
  readActiveSession: vi.fn(),
  isActiveSession: vi.fn(),
}));

import { handleActiveLegacyFilmHandoff } from '../../src/server/utils/legacy-film-handoff';
import {
  type ActiveSession,
  isActiveSession,
  readActiveSession,
} from '../../src/server/utils/session';
import { allowedApiPath } from '../../src/server/utils/upstream';

const legacyId = 'abcdefab-2222-4222-8222-111111111111';
const rankingId = 'abcdefab-2222-4222-8222-222222222222';
const entryId = 'abcdefab-2222-4222-8222-333333333333';
const oldPath = `/movie/${legacyId}`;
const resolver = `/movies/collections/legacy-film-links/${legacyId}`;
const session: ActiveSession = {
  user: {
    id: 'synthetic-user',
    name: 'Fixture',
    username: 'fixture@example.invalid',
    roles: [],
    expiresAt: Date.now() + 60_000,
    generation: 'synthetic-generation',
  },
  secure: { accessToken: 'synthetic-session-credential' },
  csrfToken: 'synthetic-csrf',
};
const activeMapping = { ranking_id: rankingId, entry_id: entryId };
const browserHeaders = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
};
const fetch = vi.fn<typeof globalThis.fetch>();

function request(
  url = oldPath,
  method = 'GET',
  headers: Record<string, string | undefined> = browserHeaders,
) {
  const response = new Map<string, string>();
  const res = {
    statusCode: 200,
    getHeader: (name: string) => response.get(name.toLowerCase()),
    setHeader: (name: string, value: string) => response.set(name.toLowerCase(), value),
  };
  const event = {
    node: { req: { url, method, headers }, res },
    context: {},
  };
  return {
    response,
    res,
    invoke: () => handleActiveLegacyFilmHandoff(event as unknown as H3Event),
  };
}

function expectNeutral({ response, res }: ReturnType<typeof request>) {
  expect(res.statusCode).toBe(404);
  expect(response.get('cache-control')).toBe('no-store, private');
  expect(response.get('referrer-policy')).toBe('no-referrer');
  expect(response.has('location')).toBe(false);
}

beforeEach(() => {
  vi.mocked(readActiveSession).mockReset().mockResolvedValue(session);
  vi.mocked(isActiveSession).mockReset().mockReturnValue(true);
  fetch.mockReset();
  vi.stubGlobal('fetch', fetch);
});

test('uses only the queryless authorized lookup and produces the canonical collection-only 307', async () => {
  fetch.mockResolvedValueOnce(Response.json(activeMapping));
  const req = request(`${oldPath}?next=//somewhere.invalid&to=${entryId}#old-film`);
  await req.invoke();
  expect(req.res.statusCode).toBe(307);
  expect(req.response.get('cache-control')).toBe('no-store, private');
  expect(req.response.get('referrer-policy')).toBe('no-referrer');
  expect(req.response.get('location')).toBe(`/movies/collections/${rankingId}#`);
  expect(req.response.get('set-cookie')).toContain('SameSite=Lax');
  expect(req.response.get('set-cookie')).toContain('moviemux-history-moved=moved;');
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    new URL('http://127.0.0.1:18081/api/monolith' + resolver),
    expect.objectContaining({
      method: 'GET',
      body: undefined,
      redirect: 'manual',
      headers: { accept: 'application/json', authorization: 'Bearer synthetic-session-credential' },
    }),
  );
});

test.each([
  '/home',
  '/movie/discover?movie=42',
  '/movie/watchlist',
  `/movie/watchlist/${legacyId}`,
  '/movie/add',
  `/movie/edit/${legacyId}`,
  '/movie/dashboard',
  `/rankings/${legacyId}`,
  `/api${oldPath}`,
  `https://movie.invalid${oldPath}`,
  `/movie//${legacyId}`,
  `/movie/./${legacyId}`,
  `/movie/${legacyId.toUpperCase()}`,
  `/movie/%61${legacyId.slice(1)}`,
  `${oldPath}/`,
  `${oldPath}\n`,
  `${oldPath}%2f`,
  `${oldPath}/more`,
])('does not take over unrelated or unrecognized target %s', async (url) => {
  const req = request(url);
  expect(await req.invoke()).toBeUndefined();
  expect(req.response.size).toBe(0);
  expect(readActiveSession).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test.each(['HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])(
  'does not authenticate, resolve or redirect %s even with HTML headers',
  async (method) => {
    const req = request(oldPath, method);
    await req.invoke();
    expectNeutral(req);
    expect(readActiveSession).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);

test.each([
  { accept: 'application/json' },
  { accept: '*/*' },
  { accept: 'text/html;q=0,*/*;q=1' },
  { accept: 'text/html;q=invalid' },
  { accept: 'text/html;q=1=invalid' },
  { ...browserHeaders, 'sec-fetch-mode': 'cors' },
  { ...browserHeaders, 'sec-fetch-dest': 'iframe' },
  { ...browserHeaders, 'sec-purpose': 'prefetch;prerender' },
  { ...browserHeaders, purpose: 'prefetch' },
  { ...browserHeaders, 'content-length': '1' },
  { ...browserHeaders, 'transfer-encoding': 'chunked' },
])('does not resolve non-document, speculative or non-bodyless GET %o', async (headers) => {
  const req = request(oldPath, 'GET', headers);
  await req.invoke();
  expectNeutral(req);
  expect(readActiveSession).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test('never resolves a link without an active session', async () => {
  vi.mocked(readActiveSession).mockRejectedValueOnce(new Error('not signed in'));
  const req = request();
  await req.invoke();
  expectNeutral(req);
  expect(fetch).not.toHaveBeenCalled();
});

test('a session revoked while the lookup is pending cannot yield the private destination', async () => {
  fetch.mockImplementationOnce(async () => {
    vi.mocked(isActiveSession).mockReturnValue(false);
    return Response.json(activeMapping);
  });
  const req = request();
  await req.invoke();
  expectNeutral(req);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test.each([301, 307, 401, 403, 404, 410, 503, 201])(
  'normalizes unexpected resolver status %s without disclosing headers, IDs or metadata',
  async (status) => {
    fetch.mockResolvedValueOnce(
      Response.json(activeMapping, { status, headers: { location: 'https://unsafe.invalid' } }),
    );
    const req = request();
    await req.invoke();
    expectNeutral(req);
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

test.each([
  null,
  [activeMapping],
  { ranking_id: rankingId },
  { ...activeMapping, entry_id: entryId + '\n' },
  { ...activeMapping, entry_id: entryId.toUpperCase() },
  { ...activeMapping, ranking_id: '//unsafe.invalid' },
  { ...activeMapping, redirect: '/movie/another' },
  { ...activeMapping, title: 'private' },
])('normalizes malformed or expanded 200 DTO %o', async (payload) => {
  fetch.mockResolvedValueOnce(Response.json(payload));
  const req = request();
  await req.invoke();
  expectNeutral(req);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('normalizes network failure and keeps only exact GET aliases on the BFF allowlist', async () => {
  fetch.mockRejectedValueOnce(new Error('private transport URL'));
  const req = request();
  await req.invoke();
  expectNeutral(req);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(allowedApiPath(resolver, 'GET')).toBe(true);
  expect(allowedApiPath(`/rankings/legacy-film-links/${legacyId}`, 'GET')).toBe(true);
});
