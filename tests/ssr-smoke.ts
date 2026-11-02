/** Production SSR through the real Nuxt session/BFF; upstream data is fictional. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const port = 3100;
const apiPort = 3101;
const origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  QA_API_PORT: String(apiPort),
  NUXT_API_UPSTREAM: `http://127.0.0.1:${apiPort}`,
  NUXT_SOCKET_UPSTREAM: '',
  NUXT_TRUSTED_ORIGINS: origin,
  NUXT_PUBLIC_TURNSTILE_ENABLED: 'false', // Isolated loopback session/transport fixtures only.
  NUXT_APP_SECRET: randomBytes(48).toString('base64url'),
  NUXT_SESSION_COOKIE_SECURE: 'false',
  NODE_ENV: 'production',
};
const api = spawn(process.execPath, ['scripts/qa/mock-api.ts'], { env, stdio: 'pipe' });
const app = spawn(process.execPath, ['.output/server/index.mjs'], { env, stdio: 'pipe' });
let serverLog = '';
app.stderr.on('data', (data) => {
  serverLog += String(data);
});
const request = (path: string, cookie = '', options: RequestInit = {}) =>
  fetch(`${origin}${path}`, {
    ...options,
    redirect: 'manual',
    headers: { accept: 'text/html', ...(cookie ? { cookie } : {}), ...options.headers },
  });
function assertBrandAccent(html: string) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
    ),
  );
  const colors = tags.filter((tag) => tag.name === 'theme-color' || tag.property === 'theme-color');
  assert.equal(colors.length, 1, 'Exactly one SSR accent tag, without conflicting theme overrides');
  assert.equal(colors[0]?.content, '#00f6ff', 'Crawler accent stays the exact MovieMux primary');
}
async function login(name: string) {
  const response = await request('/api/login', '', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${name}@ssr.test`, password: 'fictional-test-only' }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  const data = await response.json();
  assert.equal(data.user.name, name);
  assert.doesNotMatch(
    JSON.stringify(data),
    /access_token|accessToken|secure|qa-fixture-not-a-real-signature/,
  );
  const cookies = response.headers.getSetCookie();
  const cookie = cookies
    .filter(
      (value) => value.startsWith('moviemux-session=') && !value.startsWith('moviemux-session=;'),
    )
    .at(-1)!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  return { cookie: cookie.split(';')[0]!, csrf: data.csrfToken };
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      await request('/');
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(ready, 'Production server started');
  const landing = await request('/');
  assert.equal(landing.status, 200, await landing.clone().text());
  const landingHtml = await landing.text();
  assert.match(landingHtml, /Grandes histórias/);
  assertBrandAccent(landingHtml);
  for (const theme of ['dark', 'light']) {
    const shared = await request('/?from=%2Fmovie%2Fdiscover%3Fmovie%3D969681', `theme=${theme}`);
    assert.equal(shared.status, 200);
    assertBrandAccent(await shared.text());
  }
  assert.equal((await request('/home')).status, 302);
  assert.equal((await request('/home', 'moviemux-session=broken')).status, 302);
  const admin = await login('AdminFixture');
  const other = await login('OtherFixture');
  const [first, second] = await Promise.all([
    request('/home', admin.cookie),
    request('/home', other.cookie),
  ]);
  const firstHtml = await first.text();
  const secondHtml = await second.text();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.match(firstHtml, /AdminFixture/);
  assert.doesNotMatch(firstHtml, /OtherFixture/);
  assert.match(secondHtml, /OtherFixture/);
  assert.doesNotMatch(secondHtml, /AdminFixture/);
  assertBrandAccent(firstHtml);
  assertBrandAccent(secondHtml);
  assert.doesNotMatch(firstHtml + secondHtml, /access_token|qa-fixture-not-a-real-signature/);
  assert.equal((await request('/adm', other.cookie)).status, 403);
  for (const path of [
    '/home',
    '/movie/add',
    '/movie/movie-1',
    '/movie/edit/movie-1',
    '/movie/discover',
    '/movie/watchlist',
    '/movie/watchlist/list-1',
    '/movie/dashboard',
    '/profile',
    '/adm',
  ]) {
    const response = await request(path, admin.cookie);
    assert.equal(
      response.status,
      200,
      `${path} renders: ${await response
        .clone()
        .text()
        .then((text) => text.slice(0, 180))}`,
    );
  }
  const session = await request('/api/_auth/session', admin.cookie);
  assert.match(session.headers.get('cache-control') || '', /no-store/);
  assert.doesNotMatch(await session.text(), /accessToken|secure|qa-fixture-not-a-real-signature/);
  for (const badOrigin of ['https://evil.test', 'null', '']) {
    const response = await request('/api/logout', admin.cookie, {
      method: 'POST',
      headers: { ...(badOrigin ? { origin: badOrigin } : {}), 'x-csrf-token': admin.csrf },
    });
    assert.equal(response.status, 403);
  }
  assert.equal(
    (
      await request('/api/logout', admin.cookie, {
        method: 'POST',
        headers: { origin, 'x-csrf-token': admin.csrf },
      })
    ).status,
    200,
  );
  assert.equal(
    (await request('/api/movie', admin.cookie)).status,
    401,
    'Copied cookie revoked within current server process',
  );
  for (const path of ['/manifest.json', '/sw.js', '/offline.html'])
    assert.equal((await request(path)).status, 200);
  const worker = await (await request('/sw.js')).text();
  assert.match(worker, /url:\s*["']\/offline\.html["']/);
  assert.match(worker, /NetworkOnly/);
  const manifest = await (await request('/manifest.json')).json();
  assert.equal(manifest.theme_color, '#00f6ff');
  assert.doesNotMatch(serverLog, /Unhandled|ReferenceError|TypeError/);
  console.log(
    'PASS: HttpOnly login, safe session/SSR, two-user isolation, role403, CSRF rejection, logout replay rejection, protected routes and PWA assets. Upstream fixtures only.',
  );
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  app.kill();
  api.kill();
}
