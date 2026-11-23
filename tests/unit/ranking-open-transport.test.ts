import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('nuxt/server', () => ({
  createError: (options: { status: number; message: string; data?: unknown }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => ({ apiUpstream: 'http://127.0.0.1:18081/api' }),
}));

import { rankingRequestBody } from '../../src/server/utils/ranking-requests';
import {
  allowedApiPath,
  assertRankingReadQuery,
  upstreamRequest,
} from '../../src/server/utils/upstream';

const path = '/rankings/00000000-0000-4000-a000-000000000011/join';
const invalidJoin = { status: 400, data: { code: 'ranking.invalid_join' } };
afterEach(() => vi.unstubAllGlobals());

describe('OPEN join BFF', () => {
  it('permits only exact authenticated-method join path', () => {
    expect(allowedApiPath(path, 'POST')).toBe(true);
    for (const method of ['GET', 'HEAD', 'DELETE', 'PATCH', 'OPTIONS']) {
      expect(allowedApiPath(path, method)).toBe(false);
    }
    for (const malformed of [
      path + '/',
      path.replace('/join', '/%6aoin'),
      path.replace('/join', '//join'),
      path.replace('00000000-', '0-'),
    ]) {
      expect(allowedApiPath(malformed, 'POST')).toBe(false);
    }
  });

  it('rejects all query strings and body bytes, including whitespace', () => {
    expect(() => assertRankingReadQuery(path, 'POST', new URLSearchParams())).not.toThrow();
    expect(() => assertRankingReadQuery(path, 'POST', new URLSearchParams(), true)).toThrow(
      expect.objectContaining(invalidJoin),
    );
    expect(() => assertRankingReadQuery(path, 'POST', new URLSearchParams('x='))).toThrow(
      expect.objectContaining(invalidJoin),
    );
    expect(rankingRequestBody(path, 'POST', '', undefined)).toBeUndefined();
    for (const body of ['{}', ' ', '\u0000', 'actor=123']) {
      expect(() => rankingRequestBody(path, 'POST', body, undefined)).toThrow(
        expect.objectContaining(invalidJoin),
      );
    }
  });

  it('returns only an exact empty 204', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(upstreamRequest(path, { method: 'POST', token: 'synthetic' })).resolves.toEqual({
      status: 204,
      data: null,
    });
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:18081/api' + path),
      expect.objectContaining({
        body: undefined,
        method: 'POST',
        headers: { accept: 'application/json', authorization: 'Bearer synthetic' },
      }),
    );
    fetch.mockResolvedValueOnce(new Response('{"title":"private"}', { status: 200 }));
    await expect(upstreamRequest(path, { method: 'POST' })).rejects.toMatchObject({ status: 502 });
  });

  it.each([
    [400, 'ranking.invalid_join'],
    [404, 'ranking.not_found'],
  ])('allowlists exact status/code %s %s, never upstream message', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ code, message: 'private' }), { status })),
    );
    await expect(upstreamRequest(path, { method: 'POST' })).rejects.toMatchObject({
      status,
      data: { code },
      message: 'API request failed',
    });
  });
});
