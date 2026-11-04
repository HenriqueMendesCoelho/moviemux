/** Production-rendered locale isolation using fictional loopback API data, not live acceptance. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const port = 3190;
const apiPort = 3191;
const origin = `http://127.0.0.1:${port}`;
const cookieName = 'moviemux-language';
const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  QA_API_PORT: String(apiPort),
  NUXT_API_UPSTREAM: `http://127.0.0.1:${apiPort}`,
  NUXT_SOCKET_UPSTREAM: '',
  NUXT_TRUSTED_ORIGINS: origin,
  NUXT_PUBLIC_TURNSTILE_ENABLED: 'false',
  NUXT_APP_SECRET: randomBytes(48).toString('base64url'),
  NUXT_SESSION_COOKIE_SECURE: 'false',
  NODE_ENV: 'production',
};
const api = spawn(process.execPath, ['scripts/qa/mock-api.ts'], { env, stdio: 'pipe' });
const app = spawn(process.execPath, ['.output/server/index.mjs'], { env, stdio: 'pipe' });
let serverLog = '';
for (const child of [api, app]) {
  child.stdout.on('data', (data) => (serverLog += String(data)));
  child.stderr.on('data', (data) => (serverLog += String(data)));
}
const request = (path: string, cookie = '', options: RequestInit = {}) =>
  fetch(`${origin}${path}`, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
    headers: { accept: 'text/html', ...(cookie ? { cookie } : {}), ...options.headers },
  });
const textOnly = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
function catalog(locale: string, namespace: string): Record<string, string> {
  return JSON.parse(readFileSync(`i18n/locales/${locale}/${namespace}.json`, 'utf8'));
}
function assertSafeHtml(html: string, locale: string) {
  assert.match(html, new RegExp(`<html\\b[^>]*lang="${locale}"`), 'SSR document locale');
  assert.doesNotMatch(
    textOnly(html),
    /\b(?:account|shell|catalog|library|shared|movie|pages|components)\.[A-Za-z][\w.]*/,
    'No unresolved message keys in rendered content',
  );
  assert.doesNotMatch(
    html,
    /access_token|accessToken|qa-fixture-not-a-real-signature|fictional-test-only/,
    'No private token/password in SSR payload',
  );
}
async function rendered(path: string, locale: string, session = '') {
  const cookie = [session, `${cookieName}=${locale}`].filter(Boolean).join('; ');
  const response = await request(path, cookie);
  assert.equal(
    response.status,
    200,
    `${path} (${locale}): ${await response
      .clone()
      .text()
      .then((text) => text.slice(0, 200))}`,
  );
  const html = await response.text();
  assertSafeHtml(html, locale);
  return html;
}
async function login(name: string) {
  const response = await request('/api/login', `${cookieName}=en`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${name}@ssr.test`, password: 'fictional-test-only' }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  const data = await response.json();
  assert.equal(data.user.name, name);
  assert.doesNotMatch(
    JSON.stringify(data),
    /access_token|accessToken|qa-fixture-not-a-real-signature/,
  );
  const cookie = response.headers
    .getSetCookie()
    .find(
      (value) => value.startsWith('moviemux-session=') && !value.startsWith('moviemux-session=;'),
    );
  assert.ok(cookie, 'Session cookie returned');
  assert.match(cookie, /HttpOnly/);
  return { cookie: cookie.split(';')[0]!, csrf: data.csrfToken as string };
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await request('/api/_auth/session');
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* Wait only for isolated child startup. */
    }
    if (app.exitCode !== null || api.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Production server started: ${serverLog}`);
  const anonymous = await request('/', '', { headers: { 'accept-language': 'en-US,en;q=0.9' } });
  assert.equal(anonymous.status, 200);
  const defaultHtml = await anonymous.text();
  assertSafeHtml(defaultHtml, 'pt-BR');
  assert.ok(textOnly(defaultHtml).includes(catalog('pt-BR', 'account').greatStories!));
  assert.ok(!textOnly(defaultHtml).includes(catalog('en', 'account').greatStories!));
  const english = await rendered('/', 'en');
  assert.ok(textOnly(english).includes(catalog('en', 'account').greatStories!));
  assert.ok(!textOnly(english).includes(catalog('pt-BR', 'account').greatStories!));
  for (const value of ['unsupported', 'EN', '%3Cscript%3E', '%ZZ', 'en-US']) {
    const response = await request('/', `${cookieName}=${value}`);
    assert.equal(response.status, 200, `Malformed locale ${value} must remain renderable`);
    const html = await response.text();
    assertSafeHtml(html, 'pt-BR');
    assert.ok(textOnly(html).includes(catalog('pt-BR', 'account').greatStories!));
  }
  const admin = await login('AdminFixture');
  const other = await login('OtherFixture');
  for (let batch = 0; batch < 3; batch++) {
    const combinations = [
      { locale: 'en', session: admin.cookie, name: 'AdminFixture', absent: 'OtherFixture' },
      { locale: 'pt-BR', session: other.cookie, name: 'OtherFixture', absent: 'AdminFixture' },
      { locale: 'pt-BR', session: admin.cookie, name: 'AdminFixture', absent: 'OtherFixture' },
      { locale: 'en', session: other.cookie, name: 'OtherFixture', absent: 'AdminFixture' },
    ];
    await Promise.all(
      combinations.map(async ({ locale, session, name, absent }) => {
        const html = await rendered('/home', locale, session);
        assert.ok(textOnly(html).includes(catalog(locale, 'catalog').collection!));
        assert.ok(html.includes(name));
        assert.ok(!html.includes(absent), 'Concurrent user payload isolation');
      }),
    );
  }
  const routes = [
    ['/home', 'catalog', 'collection'],
    ['/movie/discover', 'catalog', 'discoverMovies'],
    ['/movie/dashboard', 'library', 'statistics'],
    ['/movie/watchlist', 'library', 'myLists'],
    ['/profile', 'account', 'myProfile'],
    ['/adm', 'account', 'administration'],
  ];
  for (const locale of ['pt-BR', 'en']) {
    for (const [path, namespace, key] of routes) {
      const html = await rendered(path!, locale, admin.cookie);
      assert.ok(
        textOnly(html).includes(catalog(locale, namespace!)[key!]!),
        `${path}: localized route heading`,
      );
    }
    for (const path of [
      '/movie/add',
      '/movie/movie-1',
      '/movie/edit/movie-1',
      '/movie/watchlist/list-1',
    ]) {
      await rendered(path, locale, admin.cookie);
    }
    const notFound = await request('/missing-i18n-fixture', `${cookieName}=${locale}`);
    assert.ok([200, 404].includes(notFound.status), 'Not-found route renders application page');
    const html = await notFound.text();
    assertSafeHtml(html, locale);
    assert.ok(textOnly(html).includes(catalog(locale, 'shell').notFoundTitle!));
    const forbidden = await request('/adm', `${other.cookie}; ${cookieName}=${locale}`);
    assert.equal(forbidden.status, 403, 'Language selection does not change permissions');
    const forbiddenHtml = await forbidden.text();
    assertSafeHtml(forbiddenHtml, locale);
    assert.ok(
      textOnly(forbiddenHtml).includes(catalog(locale, 'pages').accessDenied!),
      'Forbidden page uses requested language',
    );
  }
  const session = await request('/api/_auth/session', `${admin.cookie}; ${cookieName}=en`);
  assert.match(session.headers.get('cache-control') || '', /no-store/);
  assert.doesNotMatch(await session.text(), /accessToken|secure|qa-fixture-not-a-real-signature/);
  const logout = await request('/api/logout', `${admin.cookie}; ${cookieName}=en`, {
    method: 'POST',
    headers: { origin, 'x-csrf-token': admin.csrf },
  });
  assert.equal(logout.status, 200);
  assert.ok(
    !logout.headers.getSetCookie().some((value) => value.startsWith(`${cookieName}=`)),
    'Logout does not clear language preference',
  );
  const returned = await rendered('/', 'en');
  assert.ok(textOnly(returned).includes(catalog('en', 'account').welcomeBack!));
  assert.doesNotMatch(
    serverLog,
    /Unhandled|ReferenceError|TypeError|Not found .* key|message compilation error/i,
  );
  console.log(
    'PASS: real Nitro SSR default pt-BR despite English browser, en cookie, five invalid preferences, 12 concurrent mixed-user/locale requests, ten authenticated routes in both languages, localized not-found, role403, safe payloads and locale retained after logout. Fictional upstream only; no browser hydration claim.',
  );
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  app.kill();
  api.kill();
}
