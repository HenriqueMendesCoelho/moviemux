/** Actual built Nitro BFF with a process-local Siteverify mock; no Cloudflare traffic or credentials. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const root = process.env.MOVIEMUX_REPO || process.cwd();
const base = 'http://127.0.0.1:3230';
const origin = 'https://review.moviemux.test';
const secret = 'SYNTHETIC_PRIVATE_TURNSTILE_SECRET';
const tokenField = 'cf-turnstile-response';
const appSecret = randomBytes(48).toString('base64url');
let app: ChildProcess | undefined;
let serverLog = '';
let assertions = 0;
let verificationCalls = 0;
const used = new Set<string>();
const forwarded: Array<{ path: string; body: string }> = [];
function check(value: unknown, label: string): asserts value {
  assert.ok(value, label);
  assertions++;
}
const mock = createServer(async (request, response) => {
  let body = '';
  for await (const part of request) body += String(part);
  response.setHeader('content-type', 'application/json');
  if (request.url === '/siteverify') {
    verificationCalls++;
    const form = new URLSearchParams(body);
    assert.equal(form.get('secret'), secret);
    assert.deepEqual([...form.keys()].sort(), ['response', 'secret']);
    const proof = form.get('response') || '';
    if (proof === 'http-error') {
      response.statusCode = 500;
      response.end(secret);
      return;
    }
    if (proof === 'redirect') {
      response.statusCode = 302;
      response.setHeader('location', 'https://forbidden.invalid');
      response.end();
      return;
    }
    if (proof === 'malformed') {
      response.end('not-json-' + secret);
      return;
    }
    if (proof === 'large') {
      response.end(' '.repeat(100_000));
      return;
    }
    if (used.has(proof) || proof === 'failed') {
      response.end(JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }));
      return;
    }
    used.add(proof);
    const action = proof.split(':')[1];
    response.end(
      JSON.stringify({
        success: proof === 'truthy' ? 'true' : true,
        action,
        hostname: proof.startsWith('wrong-host:')
          ? 'review.moviemux.test.evil.test'
          : 'review.moviemux.test',
      }),
    );
    return;
  }
  forwarded.push({ path: request.url || '', body });
  if (request.url === '/login') {
    const claims = {
      id: 'fixture',
      name: 'Fixture',
      sub: 'fixture@example.test',
      roles: ['USER'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const jwt =
      'e30.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.SYNTHETIC_SIGNATURE';
    response.end(JSON.stringify({ access_token: jwt }));
    return;
  }
  response.statusCode = 204;
  response.end();
});
const request = (
  path: string,
  payload: unknown,
  options: { origin?: string | null; contentType?: string; cookie?: string } = {},
) =>
  fetch(base + path, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      ...(options.origin === null ? {} : { origin: options.origin || origin }),
      'content-type': options.contentType || 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
async function stop() {
  if (!app || app.exitCode !== null) return;
  const exited = once(app, 'exit');
  app.kill();
  await exited;
}
function launch(overrides: Record<string, string> = {}) {
  serverLog = '';
  app = spawn(
    process.execPath,
    [
      '--import',
      resolve(root, 'tests/fixtures/turnstile-siteverify-preload.ts'),
      '.output/server/index.mjs',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3230',
        NUXT_APP_SECRET: appSecret,
        NUXT_API_UPSTREAM: 'http://127.0.0.1:3231',
        NUXT_SOCKET_UPSTREAM: '',
        NUXT_TRUSTED_ORIGINS: origin,
        NUXT_SESSION_COOKIE_SECURE: 'true',
        NUXT_PUBLIC_TURNSTILE_ENABLED: 'true',
        NUXT_TURNSTILE_SECRET: secret,
        NUXT_TURNSTILE_HOSTNAMES: 'review.moviemux.test',
        ...overrides,
      },
      stdio: 'pipe',
    },
  );
  app.stdout?.on('data', (data) => {
    serverLog += String(data);
  });
  app.stderr?.on('data', (data) => {
    serverLog += String(data);
  });
}
async function ready() {
  for (let i = 0; i < 100; i++) {
    if (app?.exitCode !== null)
      throw new Error('Disposable BFF exited before readiness; logs withheld');
    try {
      await fetch(base + '/api/_auth/session', { signal: AbortSignal.timeout(500) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error('Disposable BFF did not start');
}
async function rejected(
  path: string,
  payload: unknown,
  status: number,
  label: string,
  options: Parameters<typeof request>[2] = {},
) {
  const before = forwarded.length;
  const result = await request(path, payload, options);
  check(result.status === status, `${label}: expected${status}, received${result.status}`);
  check(forwarded.length === before, `${label}: no upstream side effect`);
  const text = await result.text();
  check(
    !text.includes(secret) && !text.includes('SYNTHETIC_SIGNATURE'),
    `${label}: no credential reflection`,
  );
}
const login = { email: 'fixture@example.test', password: 'fictional-password' };
const routes = [
  ['/api/login', 'login', login],
  ['/api/public/user', 'signup', { ...login, name: 'Fixture', invite_code: 'fixture' }],
  ['/api/public/user/password/reset', 'password_recovery', { email: login.email }],
  [`/api/public/user/password/${'a'.repeat(200)}/reset`, 'password_reset', login],
] as const;
try {
  await new Promise<void>((resolve, reject) => {
    mock.once('error', reject);
    mock.listen(3231, '127.0.0.1', resolve);
  });
  launch();
  await ready();
  for (const [path, action, payload] of routes) {
    for (const proof of [undefined, '', ' ', 'x'.repeat(2049), 5]) {
      const before = verificationCalls;
      await rejected(path, { ...payload, [tokenField]: proof }, 403, `${action} invalid proof`);
      check(verificationCalls === before, 'invalid proof never reaches verifier');
    }
    for (const proof of ['failed', `wrong-host:${action}`, 'wrong-action:other', 'truthy'])
      await rejected(path, { ...payload, [tokenField]: proof }, 403, `${action} untrusted result`);
    const proof = `ok:${action}:once`;
    const result = await request(path, { ...payload, [tokenField]: proof });
    check(result.status === (action === 'login' ? 200 : 204), `${action} success`);
    check(
      !forwarded.at(-1)?.body.includes(tokenField) && !forwarded.at(-1)?.body.includes(proof),
      `${action} proof stripped`,
    );
    check(
      JSON.parse(forwarded.at(-1)!.body).email === login.email,
      `${action} application payload preserved`,
    );
    await rejected(path, { ...payload, [tokenField]: proof }, 403, `${action} replay denied`);
  }
  for (const proof of ['network-error', 'http-error', 'redirect', 'malformed', 'large', 'timeout'])
    await rejected('/api/login', { ...login, [tokenField]: proof }, 503, `verifier ${proof}`);
  for (const key of ['a'.repeat(128), 'a'.repeat(199), 'a'.repeat(201), 'a'.repeat(199) + '-']) {
    const before = verificationCalls;
    await rejected(
      `/api/public/user/password/${key}/reset`,
      { ...login, [tokenField]: 'ok:password_reset:wrong-key' },
      404,
      'invalid reset key contract',
    );
    check(verificationCalls === before, 'invalid reset key rejected before verification');
  }
  for (const badOrigin of [null, 'null', 'https://evil.test']) {
    const before = verificationCalls;
    await rejected(
      '/api/login',
      { ...login, [tokenField]: 'ok:login:origin' },
      403,
      'Origin enforced',
      { origin: badOrigin },
    );
    check(verificationCalls === before, 'Origin rejected before verification');
  }
  await rejected(
    '/api/public/user',
    JSON.stringify({ padding: 'x'.repeat(140_000), [tokenField]: 'ok:signup:large' }),
    413,
    'body bound',
  );
  await rejected(
    '/api/public/user',
    'cf-turnstile-response=a&cf-turnstile-response=b',
    403,
    'duplicate form proofs',
    { contentType: 'application/x-www-form-urlencoded' },
  );
  const form = new URLSearchParams({
    email: login.email,
    [tokenField]: 'ok:password_recovery:form',
  });
  check(
    (
      await request('/api/public/user/password/reset', form.toString(), {
        contentType: 'application/x-www-form-urlencoded',
      })
    ).status === 204,
    'form recovery accepted',
  );
  check(forwarded.at(-1)?.body === 'email=fixture%40example.test', 'form proof stripped');
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      request('/api/public/user/password/reset', {
        email: login.email,
        [tokenField]: 'ok:password_recovery:parallel',
      }),
    ),
  );
  check(
    concurrent
      .map((r) => r.status)
      .sort()
      .join(',') === '204,403',
    'concurrent replay allows one request',
  );
  const sessionResponse = await request('/api/login', { ...login, [tokenField]: 'ok:login:csrf' });
  const cookie = sessionResponse.headers
    .getSetCookie()
    .find((v) => v.startsWith('moviemux-session='))
    ?.split(';')[0];
  check(cookie, 'verified login sets session');
  await rejected('/api/logout', {}, 403, 'session CSRF unchanged', { cookie });
  const ssr = await fetch(base + '/', { signal: AbortSignal.timeout(5000) });
  check(!(await ssr.text()).includes(secret), 'private verifier secret absent SSR');
  check(!serverLog.includes(secret), 'private verifier secret absent logs');
  await stop();
  launch({ NUXT_TURNSTILE_SECRET: '' });
  await ready();
  await rejected(
    '/api/login',
    { ...login, [tokenField]: 'ok:login:missingconfig' },
    503,
    'missing config fails closed',
  );
  await stop();
  launch({ NUXT_TRUSTED_ORIGINS: base, NUXT_PUBLIC_TURNSTILE_ENABLED: 'false' });
  await ready();
  check(
    (await request('/api/login', login, { origin: base })).status === 200,
    'explicit loopback disable accepted',
  );
  await stop();
  const unsafeConfigs: Array<Record<string, string>> = [
    { NUXT_PUBLIC_TURNSTILE_ENABLED: 'false' },
    { NUXT_TURNSTILE_SECRET: '1x0000000000000000000000000000000AA' },
    { NUXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
  ];
  for (const overrides of unsafeConfigs) {
    launch(overrides);
    let started = false;
    try {
      await ready();
      started = true;
    } catch (error) {
      if (app?.exitCode === null) throw error;
      check(app?.exitCode !== 0, 'unsafe public configuration refuses startup');
    }
    if (started) {
      await rejected(
        '/api/login',
        { ...login, [tokenField]: 'ok:login:unsafeconfig' },
        503,
        'unsafe public configuration fails closed',
      );
    }
    await stop();
  }
  console.log(
    `PASS ${assertions} Turnstile BFF security assertions. Controlled verification mock only; real widget/Cloudflare acceptance remains pending.`,
  );
} finally {
  await stop();
  mock.closeAllConnections();
  await new Promise<void>((resolve) => mock.close(() => resolve()));
}
