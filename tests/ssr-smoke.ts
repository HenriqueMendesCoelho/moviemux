/** Production SSR checks using fictional local data, not a live backend. Run after build. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const port = 3100;
const apiPort = 3101;
const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(port),
  QA_API_PORT: String(apiPort),
  NUXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
  NUXT_PUBLIC_SOCKET_URL: '',
};
const api = spawn(process.execPath, ['scripts/qa/mock-api.ts'], { env, stdio: 'pipe' });
const app = spawn(process.execPath, ['.output/server/index.mjs'], { env, stdio: 'pipe' });
let serverLog = '';
app.stderr.on('data', (data) => {
  serverLog += String(data);
});
function fixtureToken(name: string, roles = ['USER']) {
  return `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: name, name, aud: `${name}@example.test`, roles, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
}
const request = (path: string, token?: string) =>
  fetch(`http://127.0.0.1:${port}${path}`, {
    redirect: 'manual',
    headers: token ? { cookie: `auth-kb=${token}` } : {},
  });
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      await request('/');
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(ready, 'Production server started');
  const landing = await request('/');
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /Grandes histórias/);
  const denied = await request('/home');
  assert.equal(denied.status, 302);
  assert.equal(denied.headers.get('location'), '/?from=/home');
  const invalid = await request('/home', 'broken-token');
  assert.equal(invalid.status, 302);
  const unauthorized = await request('/home', fixtureToken('NoRole', []));
  assert.equal(unauthorized.status, 302);
  assert.match(unauthorized.headers.get('location') || '', /reason=forbidden/);
  const adminDenied = await request('/adm', fixtureToken('RegularUser'));
  assert.equal(adminDenied.status, 302);
  const [alice, bob] = await Promise.all([
    request('/home', fixtureToken('AliceFixture')),
    request('/home', fixtureToken('BobFixture')),
  ]);
  const aliceHtml = await alice.text();
  const bobHtml = await bob.text();
  assert.equal(alice.status, 200);
  assert.equal(bob.status, 200);
  assert.ok(
    aliceHtml.includes('AliceFixture') && !aliceHtml.includes('BobFixture'),
    'Alice SSR session isolated',
  );
  assert.ok(
    bobHtml.includes('BobFixture') && !bobHtml.includes('AliceFixture'),
    'Bob SSR session isolated',
  );
  for (const path of [
    '/profile',
    '/movie/add',
    '/movie/movie-1',
    '/movie/edit/movie-1',
    '/movie/discover',
    '/movie/watchlist',
    '/movie/watchlist/list-1',
    '/movie/dashboard',
    '/adm',
  ]) {
    const response = await request(path, fixtureToken('AdminFixture', ['ADM', 'USER']));
    assert.equal(response.status, 200, `${path} SSR renders`);
  }
  for (const path of ['/manifest.json', '/sw.js']) {
    const response = await request(path);
    assert.equal(response.status, 200, `${path} exists`);
  }
  const worker = await (await request('/sw.js')).text();
  assert.match(worker, /url:\s*["']\/offline\.html["']/);
  assert.match(worker, /NetworkOnly/);
  assert.match(worker, /PrecacheFallbackPlugin/);
  assert.equal((await request('/offline.html')).status, 200);
  const manifest = await (await request('/manifest.json')).json();
  assert.equal(manifest.theme_color, '#00f6ff');
  assert.equal(manifest.display, 'standalone');
  assert.doesNotMatch(
    serverLog,
    /\[nuxt\].*(error|unavailable)|Unhandled|ReferenceError|TypeError/i,
  );
  console.log(
    'PASS: production SSR, role redirects, malformed tokens, concurrent session isolation, 9 protected routes and PWA assets. Fictional fixtures only.',
  );
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  app.kill();
  api.kill();
}
