// Server policy units; transport/browser acceptance is separate.
import { describe, it, expect, vi } from 'vitest';
vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  setResponseStatus: vi.fn(),
  createError: (options: { status: number; message: string }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => ({
    trustedOrigins: 'https://moviemux.test,http://127.0.0.1:3002',
    apiUpstream: 'http://127.0.0.1:18081/api',
  }),
}));
vi.mock('#auth-server', () => ({ getUserSession: vi.fn() }));
import { safeClaimsFromUpstream, publicSession } from '../../src/server/utils/session';
import {
  assertTrustedOrigin,
  assertSessionCsrf,
  trustedOrigins,
} from '../../src/server/utils/security';
import { allowedApiPath } from '../../src/server/utils/upstream';
import * as upstream from '../../src/server/utils/upstream';
import { getUserSession } from '#auth-server';
import apiRoute from '../../src/server/api/[...path]';
import apiSecurity from '../../src/server/middleware/api-security';
import {
  revokeSession,
  isSessionRevoked,
  onSessionRevoked,
} from '../../src/server/utils/session-registry';
const jwt = (claims: Record<string, unknown>) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const claims = {
  id: 'fixture-user',
  name: 'Fixture',
  sub: 'fixture@example.test',
  aud: ['https://www.moviemux.com/api'],
  roles: ['USER'],
  exp: Math.floor(Date.now() / 1000) + 3600,
};
describe('server session boundaries', () => {
  it('uses actual backend subject, not its audience array, as username', () => {
    expect(safeClaimsFromUpstream(jwt(claims))).toMatchObject({
      username: claims.sub,
      id: claims.id,
      roles: ['USER'],
    });
  });
  it('rotates nonsecret generation even for same-user login', () => {
    expect(safeClaimsFromUpstream(jwt(claims)).generation).not.toBe(
      safeClaimsFromUpstream(jwt(claims)).generation,
    );
  });
  it('rejects expired or malformed upstream credentials without reflecting them', () => {
    expect(() => safeClaimsFromUpstream(jwt({ ...claims, exp: 1 }))).toThrow(
      'Invalid authentication response',
    );
    expect(() => safeClaimsFromUpstream('sensitive-token')).toThrow(
      'Invalid authentication response',
    );
  });
  it('whitelists only safe public fields', () => {
    const session = {
      user: safeClaimsFromUpstream(jwt(claims)),
      csrfToken: 'nonce',
      secure: { accessToken: 'secret-jwt' },
      extra: 'secret-extra',
    };
    expect(JSON.stringify(publicSession(session))).not.toMatch(/secret|accessToken|secure|extra/);
  });
  it('requires exact configured Origin for mutations', () => {
    expect(() =>
      assertTrustedOrigin(new Headers({ origin: 'https://moviemux.test' })),
    ).not.toThrow();
    for (const origin of ['https://evil.test', 'null', 'https://moviemux.test.evil.test'])
      expect(() =>
        assertTrustedOrigin(
          new Headers({ origin, host: 'moviemux.test', 'x-forwarded-host': 'moviemux.test' }),
        ),
      ).toThrow();
    expect(() => assertTrustedOrigin(new Headers())).toThrow();
  });
  it('allows missing Origin only for explicit same-origin read transport', () => {
    expect(() =>
      assertTrustedOrigin(new Headers({ 'sec-fetch-site': 'same-origin' }), {
        allowMissingRead: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertTrustedOrigin(new Headers({ origin: 'null', 'sec-fetch-site': 'same-origin' }), {
        allowMissingRead: true,
      }),
    ).toThrow();
    expect(() => assertTrustedOrigin(new Headers(), { allowMissingRead: true })).toThrow();
  });
  it('rejects wildcard/path origin configurations', () => {
    expect(() => trustedOrigins('https://site.test/path')).toThrow();
    expect(() => trustedOrigins('*')).toThrow();
  });
  it('compares CSRF nonce and rejects missing/mismatched/oversized values', () => {
    expect(() => assertSessionCsrf('nonce', 'nonce')).not.toThrow();
    for (const value of [null, '', 'wrong', 'n'.repeat(129)])
      expect(() => assertSessionCsrf('nonce', value)).toThrow();
  });
  it('allows only known paths and methods, not traversal or arbitrary forwarding', () => {
    expect(allowedApiPath('/movie/note/abc/update', 'PATCH')).toBe(true);
    expect(allowedApiPath('/user/wishlist/abc', 'PATCH')).toBe(true);
    for (const path of [
      '/admin/secrets',
      '//evil.test',
      '/movie/%2e%2e/user',
      '/movie/%252e%252e',
      '/login',
    ])
      expect(allowedApiPath(path, 'GET')).toBe(false);
    expect(allowedApiPath('/movie', 'DELETE')).toBe(false);
  });
  it('revokes generation and notifies active bridges; unsubscribe releases listener', () => {
    const callback = vi.fn();
    const off = onSessionRevoked(callback);
    revokeSession('fixture-generation', Date.now() + 60000);
    expect(isSessionRevoked('fixture-generation')).toBe(true);
    expect(callback).toHaveBeenCalledWith('fixture-generation');
    off();
    revokeSession('other-generation', Date.now() + 60000);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('late upstream401 revokes only its generation without deleting a newer cookie', async () => {
    const oldUser = safeClaimsFromUpstream(jwt(claims));
    const newUser = safeClaimsFromUpstream(jwt(claims));
    vi.mocked(getUserSession).mockResolvedValue({
      user: oldUser,
      csrfToken: 'nonce',
      secure: { accessToken: 'fixture-token' },
    } as never);
    vi.spyOn(upstream, 'upstreamRequest').mockRejectedValue(
      Object.assign(new Error('Expired'), { status: 401 }),
    );
    const headers = new Headers();
    const event = {
      req: new Request('http://127.0.0.1/api/movie'),
      url: new URL('http://127.0.0.1/api/movie'),
      res: { headers },
      context: {},
    };
    await expect(apiRoute(event)).rejects.toMatchObject({ status: 401 });
    expect(isSessionRevoked(oldUser.generation)).toBe(true);
    expect(isSessionRevoked(newUser.generation)).toBe(false);
    expect(headers.has('set-cookie')).toBe(false);
  });
  it('leaves Engine.IO polling bodies untouched for its dedicated authenticated bridge', async () => {
    const event = {
      url: new URL('http://127.0.0.1/ws/?EIO=4&transport=polling'),
      res: { headers: new Headers() },
      context: {},
      get req(): Request {
        throw new Error('Portable request getter consumed polling body');
      },
    };
    await expect(apiSecurity(event)).resolves.toBeUndefined();
  });
});
