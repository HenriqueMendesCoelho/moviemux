/** Run after building: node tests/session-cookie-smoke.ts. Uses synthetic ports 3220–3222 only. */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const repo = process.env.MOVIEMUX_REPO || process.cwd();
const secret = randomBytes(48).toString('base64url');
const children: ChildProcess[] = [];
const api = createServer(async (req, res) => {
  for await (const chunk of req) {
    void chunk;
  }
  const token =
    'e30.' +
    Buffer.from(
      JSON.stringify({
        id: 'x',
        name: 'X',
        sub: 'x@test.local',
        roles: ['USER'],
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).toString('base64url') +
    '.SYNTHETIC';
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ access_token: token }));
});
function launch(port: number, extra: NodeJS.ProcessEnv = {}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    NUXT_APP_SECRET: secret,
    NUXT_API_UPSTREAM: 'http://127.0.0.1:3221',
    NUXT_TRUSTED_ORIGINS: `http://127.0.0.1:${port}`,
    ...extra,
  };
  delete env.NUXT_SESSION_COOKIE_SECURE;
  if ('NUXT_SESSION_COOKIE_SECURE' in extra)
    env.NUXT_SESSION_COOKIE_SECURE = extra.NUXT_SESSION_COOKIE_SECURE;
  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: repo,
    env,
    stdio: 'pipe',
  });
  children.push(child);
  return child;
}
try {
  await new Promise<void>((resolve, reject) => {
    api.once('error', reject);
    api.listen(3221, '127.0.0.1', resolve);
  });
  const secure = launch(3220);
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch('http://127.0.0.1:3220/api/_auth/session', { signal: AbortSignal.timeout(1000) });
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(ready);
  const login = await fetch('http://127.0.0.1:3220/api/login', {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:3220', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'x@test.local', password: 'synthetic' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.getSetCookie().find((c) => c.startsWith('moviemux-session='));
  assert.ok(cookie);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Path=\//);
  secure.kill();
  const bad = launch(3222, {
    NUXT_SESSION_COOKIE_SECURE: 'false',
    NUXT_TRUSTED_ORIGINS: 'https://public.test',
  });
  let log = '';
  bad.stderr.on('data', (c) => (log += c));
  bad.stdout.on('data', (c) => (log += c));
  const exit = await Promise.race([
    new Promise<number | null>((r) => bad.once('exit', r)),
    new Promise((r) => setTimeout(() => r('timeout'), 5000)),
  ]);
  assert.notEqual(exit, 'timeout');
  assert.notEqual(exit, 0);
  assert.match(log, /Insecure session cookies/);
  console.log(
    'PASS production default Secure/HttpOnly/Lax/Path cookie; insecure non-loopback configuration refuses startup.',
  );
} finally {
  for (const c of children) c.kill();
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
}
