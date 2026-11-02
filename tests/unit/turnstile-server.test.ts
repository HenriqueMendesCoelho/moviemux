import { allowedApiPath } from '../../src/server/utils/upstream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { config } = vi.hoisted(() => ({
  config: {
    trustedOrigins: 'https://moviemux.test',
    turnstileSecret: 'test-secret',
    turnstileHostnames: 'moviemux.test',
    public: {
      turnstileSiteKey: '0x4AAAAAAFwyH9xyrHzMmwps',
      turnstileEnabled: true as boolean | string,
    },
  },
}));
vi.mock('nuxt/server', () => ({
  createError: (options: { status: number; message: string }) =>
    Object.assign(new Error(options.message), options),
  useRuntimeConfig: () => config,
}));
import {
  protectedBody,
  turnstileAction,
  turnstileConfiguration,
  verifyTurnstile,
} from '../../src/server/utils/turnstile';
afterEach(() => vi.unstubAllGlobals());
const success = { success: true, action: 'login', hostname: 'moviemux.test' };
const mockResponse = (result: unknown = success) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result)));
beforeEach(() => {
  config.trustedOrigins = 'https://moviemux.test';
  config.turnstileSecret = 'test-secret';
  config.turnstileHostnames = 'moviemux.test';
  config.public.turnstileEnabled = true;
  config.public.turnstileSiteKey = '0x4AAAAAAFwyH9xyrHzMmwps';
  mockResponse();
});
describe('Turnstile server boundary', () => {
  it('matches the actual Java 200-character alphanumeric reset key contract in both gates', () => {
    const valid = `/public/user/password/${'aB9'.repeat(66)}Z0/reset`;
    expect(allowedApiPath(valid, 'POST')).toBe(true);
    expect(turnstileAction(valid, 'POST')).toBe('password_reset');
    for (const key of [
      'a'.repeat(128),
      'a'.repeat(199),
      'a'.repeat(201),
      `${'a'.repeat(199)}-`,
      `${'a'.repeat(199)}_`,
    ]) {
      const path = `/public/user/password/${key}/reset`;
      expect(allowedApiPath(path, 'POST')).toBe(false);
      expect(turnstileAction(path, 'POST')).toBeUndefined();
    }
    expect(allowedApiPath(`/movie/${'a'.repeat(200)}`, 'GET')).toBe(false);
  });

  it('rejects official test keys for public origins', () => {
    config.turnstileSecret = '1x0000000000000000000000000000000AA';
    expect(turnstileConfiguration).toThrow('Test verification keys');
    config.turnstileSecret = 'test-secret';
    config.public.turnstileSiteKey = '1x00000000000000000000AA';
    expect(turnstileConfiguration).toThrow('Test verification keys');
    config.trustedOrigins = 'http://localhost:3002';
    expect(turnstileConfiguration).not.toThrow();
  });
  it('caps verification response bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(16385))));
    await expect(verifyTurnstile('proof', 'login')).rejects.toMatchObject({ status: 503 });
  });

  it('redeems each request separately and rejects a single-use token replay', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(success))
        .mockResolvedValueOnce(
          Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
        ),
    );
    await verifyTurnstile('same-proof', 'login');
    await expect(verifyTurnstile('same-proof', 'login')).rejects.toMatchObject({ status: 403 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('maps exactly the four public authentication actions', () => {
    expect(turnstileAction('/login', 'POST')).toBe('login');
    expect(turnstileAction('/public/user', 'POST')).toBe('signup');
    expect(turnstileAction('/public/user/password/reset', 'POST')).toBe('password_recovery');
    expect(turnstileAction(`/public/user/password/${'A1'.repeat(100)}/reset`, 'POST')).toBe(
      'password_reset',
    );
    for (const path of [
      '/movie',
      '/public/movie/tmdb/1/info',
      '/public/user/extra',
      '/public/user/password/%2f/reset',
    ])
      expect(turnstileAction(path, 'POST')).toBeUndefined();
    expect(turnstileAction('/login', 'GET')).toBeUndefined();
  });
  it('uses fixed HTTPS verification with timeout, no redirects, no untrusted IP', async () => {
    await verifyTurnstile('proof', 'login');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(options?.redirect).toBe('error');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const data = options?.body as URLSearchParams;
    expect(Object.fromEntries(data)).toEqual({ secret: 'test-secret', response: 'proof' });
  });
  it.each([undefined, null, '', ' ', 1, {}, 'x'.repeat(2049)])(
    'rejects invalid token %j without network',
    async (token) => {
      await expect(verifyTurnstile(token, 'login')).rejects.toMatchObject({ status: 403 });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    { ...success, success: 'true' },
    { ...success, success: false, 'error-codes': ['timeout-or-duplicate'] },
    { ...success, action: 'signup' },
    { ...success, hostname: 'moviemux.test.evil.test' },
    { ...success, hostname: 'localhost' },
    { success: true },
  ])('rejects untrusted verification response', async (result) => {
    mockResponse(result);
    await expect(verifyTurnstile('proof', 'login')).rejects.toMatchObject({ status: 403 });
  });
  it('fails closed without secret or hostnames', async () => {
    config.turnstileSecret = '';
    await expect(verifyTurnstile('proof', 'login')).rejects.toMatchObject({ status: 503 });
    config.turnstileSecret = 'test';
    config.turnstileHostnames = '';
    await expect(verifyTurnstile('proof', 'login')).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    'https://moviemux.test',
    'moviemux.test:443',
    '*.moviemux.test',
    'localhost',
    '127.0.0.1',
  ])('rejects unsafe hostname setting %s', (hostname) => {
    config.turnstileHostnames = hostname;
    expect(turnstileConfiguration).toThrow();
  });
  it('permits explicit disable only with exclusively loopback trusted origins', async () => {
    config.public.turnstileEnabled = 'false';
    expect(turnstileConfiguration).toThrow();
    config.trustedOrigins = 'http://127.0.0.1:3002,http://localhost:3002';
    await verifyTurnstile(undefined, 'login');
    expect(fetch).not.toHaveBeenCalled();
    config.trustedOrigins += ',https://moviemux.test';
    expect(turnstileConfiguration).toThrow();
  });
  it('sanitizes network, HTTP and malformed JSON errors without retry', async () => {
    for (const response of [
      Promise.reject(new Error('secret proof')),
      Promise.resolve(new Response('secret', { status: 500 })),
      Promise.resolve(new Response('invalid JSON')),
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(response));
      await expect(verifyTurnstile('proof', 'login')).rejects.toMatchObject({
        status: 503,
        message: 'Security verification unavailable. Please try again',
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it('strips token and preserves JSON application payload', async () => {
    const body = await protectedBody(
      JSON.stringify({
        email: 'test@example.test',
        password: 'value',
        'cf-turnstile-response': 'proof',
      }),
      'application/json',
      'login',
    );
    expect(JSON.parse(body)).toEqual({ email: 'test@example.test', password: 'value' });
  });
  it('strips form token and preserves form application payload', async () => {
    expect(
      await protectedBody(
        'email=test%40example.test&cf-turnstile-response=proof',
        'application/x-www-form-urlencoded',
        'login',
      ),
    ).toBe('email=test%40example.test');
  });
  it('rejects duplicate form proofs and malformed JSON shape', async () => {
    await expect(
      protectedBody(
        'cf-turnstile-response=one&cf-turnstile-response=two',
        'application/x-www-form-urlencoded',
        'login',
      ),
    ).rejects.toMatchObject({ status: 403 });
    for (const body of ['null', '[]', '3', '{'])
      await expect(protectedBody(body, 'application/json', 'login')).rejects.toMatchObject({
        status: 400,
      });
  });
});
