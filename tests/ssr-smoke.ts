/** Production SSR through the real Nuxt session/BFF; upstream data is fictional. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
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
// Preserve the request target verbatim: URL-based clients may normalize slashes.
function rawRequest(path: string, cookie = ''): Promise<{ status: number; html: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { hostname: '127.0.0.1', port, path, headers: { accept: 'text/html', cookie } },
      (res) => {
        let html = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          html += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode || 0, html }));
      },
    );
    req.setTimeout(10000, () => req.destroy(new Error('Raw-path request timed out')));
    req.on('error', reject);
    req.end();
  });
}
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
  assert.equal((await request('/adm')).status, 302);
  assert.equal((await request('/api/movie')).status, 401);
  const collectionId = '11111111-1111-4111-8111-111111111111';
  const joinPath = `/movies/collections/${collectionId}/join`;
  for (const [legacy, target] of [
    ['/rankings', '/movies/collections'],
    [`/rankings/${collectionId}`, `/movies/collections/${collectionId}`],
    [`/rankings/${collectionId}/join`, joinPath],
    [`/public/rankings/${collectionId}`, `/public/movies/collections/${collectionId}`],
  ]) {
    const redirect = await request(legacy + '?untrusted=drop-me');
    assert.equal(redirect.status, 307, legacy);
    assert.equal(redirect.headers.get('location'), target + '#', legacy);
    assert.match(redirect.headers.get('cache-control') || '', /no-store/);
    assert.equal(redirect.headers.get('referrer-policy'), 'no-referrer');
  }
  const loginRedirect = await request(joinPath + '?untrusted=drop-me');
  assert.equal(loginRedirect.status, 302);
  assert.equal(
    new URL(loginRedirect.headers.get('location')!, origin).searchParams.get('from'),
    joinPath,
  );
  const publicShell = await request(`/public/movies/collections/${collectionId}`);
  assert.equal(publicShell.status, 200);
  assert.equal(publicShell.headers.get('set-cookie'), null);
  assert.match(await publicShell.text(), /Coleção pública/);
  for (const root of ['/rankings', '/movies/collections']) {
    const apiPath = `/api${root}/${collectionId}/join`;
    const response = await request(apiPath, '', { method: 'POST', headers: { origin } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('location'), null);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
  }
  // Real Nitro 404 formatting must not downgrade private error responses to no-cache.
  for (const path of [
    '/api/not-allowlisted',
    '/api/rankings/11111111-1111-4111-8111-111111111111',
    '/api/movies/collections/11111111-1111-4111-8111-111111111111',
  ]) {
    const response = await request(path, other.cookie, { headers: { accept: 'application/json' } });
    assert.equal(response.status, 404);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(response.headers.get('cache-control') || '', /private/);
    assert.match(response.headers.get('vary') || '', /cookie/i);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  // GHSA-r99w-jh2x-3mg9: Nitro and Nuxt must agree on the raw page path.
  // Even ADM must not resolve //x/adm as /adm; role checks alone miss that mismatch.
  // The app's existing catch-all renders its not-found view with HTTP 200.
  for (const cookie of ['', other.cookie, admin.cookie]) {
    for (const path of ['//x/adm', '///x/adm', '//x/home', '///x/home', '//x/api/movie']) {
      const response = await rawRequest(path, cookie);
      assert.equal(response.status, 200, `Existing catch-all handles raw path: ${path}`);
      assert.match(
        response.html,
        /<main class="mm-not-found"/,
        `Raw path is not remapped: ${path}`,
      );
    }
  }
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
