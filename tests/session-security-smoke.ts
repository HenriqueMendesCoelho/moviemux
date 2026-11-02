/** Run with Node 26 after building: node tests/session-security-smoke.ts. Uses synthetic ports 3210–3212 only. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const repo = process.env.MOVIEMUX_REPO || process.cwd();
const require = createRequire(repo + '/package.json');
const { Server } = require('socket.io') as typeof import('socket.io');
const { io } = require('socket.io-client') as typeof import('socket.io-client');
import type { Socket } from 'socket.io-client';
import type { ClientRequest, IncomingMessage } from 'node:http';
interface Session {
  cookie: string;
  data: { csrfToken: string; user: { name: string } };
}
interface SocketOptions {
  headers?: Record<string, string>;
  auth?: Record<string, string>;
}
interface SocketResult {
  s: Socket;
  ok: boolean;
  error?: string;
}
interface UpgradeSocket {
  terminate(): void;
  close(): void;
  once(
    event: 'unexpected-response',
    listener: (request: ClientRequest, response: IncomingMessage) => void,
  ): void;
  once(event: 'open', listener: () => void): void;
  on(event: 'error', listener: () => void): void;
}
const origin = 'http://127.0.0.1:3210';
const secret = randomBytes(48).toString('base64url');
const clients = new Set<Socket>();
let app: ChildProcess | undefined;
const records: { url: string | undefined; auth: string | undefined; body: string }[] = [];

let logs = '';
let successes = 0;
const check = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  successes++;
  console.log('PASS', successes, message);
};
const decode = (token: string): { id?: string; name?: string; sub?: string } =>
  JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString());
const api = createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  records.push({ url: req.url, auth: req.headers.authorization, body });
  res.setHeader('content-type', 'application/json');
  if (req.url === '/login') {
    const input = JSON.parse(body);
    const name = input.email.split('@')[0];
    const data = {
      id: name,
      name,
      sub: input.email,
      aud: ['https://www.moviemux.com/api'],
      roles: ['USER'],
      exp: Math.floor(Date.now() / 1000) + (name === 'short' ? 2 : 3600),
    };
    const token =
      'e30.' +
      Buffer.from(JSON.stringify(data)).toString('base64url') +
      '.REVIEW_SYNTHETIC_SIGNATURE';
    res.end(JSON.stringify({ access_token: token }));
    return;
  }
  if ((req.url || '').includes('reject401') || (req.url || '').includes('late401')) {
    if ((req.url || '').includes('late401')) await new Promise((r) => setTimeout(r, 500));
    res.statusCode = 401;
    res.end('{}');
    return;
  }
  if ((req.url || '').includes('error-test')) {
    res.statusCode = 500;
    res.end(JSON.stringify({ secret: req.headers.authorization }));
    return;
  }
  if ((req.url || '').includes('redirect-test')) {
    res.statusCode = 302;
    res.setHeader('location', 'http://evil.test');
    res.end('{}');
    return;
  }
  const user = req.headers.authorization ? decode(req.headers.authorization.slice(7)) : {};
  res.end(
    JSON.stringify(
      (req.url || '').startsWith('/movie')
        ? {
            content: [],
            total_elements: 0,
            total_pages: 1,
            number: 0,
            size: 30,
            last: true,
            first: true,
            empty: true,
          }
        : { id: user.id, name: user.name, email: user.sub, roles: ['USER'] },
    ),
  );
});
const wsServer = createServer();
const sio = new Server(wsServer, { path: '/ws' });
let upstreamCount = 0;
let upstreamClosed = 0;
for (const ns of ['/movie/all', '/movie/note'])
  sio
    .of(ns)
    .use((s, n) => {
      check(
        s.handshake.auth.token?.endsWith('.REVIEW_SYNTHETIC_SIGNATURE'),
        'only server upstream JWT',
      );
      n();
    })
    .on('connection', (s) => {
      upstreamCount++;
      s.on('disconnect', () => upstreamClosed++);
    });
const req = (path: string, cookie = '', options: RequestInit = {}) =>
  fetch(origin + path, {
    signal: AbortSignal.timeout(5000),
    ...options,
    redirect: 'manual',
    headers: { ...(cookie ? { cookie } : {}), ...options.headers },
  });
async function login(name: string, old = ''): Promise<Session> {
  const r = await req('/api/login', old, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: name + '@test.local',
      password: 'fictional',
    }),
  });
  check(r.status === 200, 'login ' + name);
  const data = await r.json();
  const raw = r.headers
    .getSetCookie()
    .find((v) => v.startsWith('moviemux-session=') && !v.startsWith('moviemux-session=;'));
  assert.ok(raw, 'login must set session cookie');
  check(/HttpOnly/.test(raw) && /SameSite=Lax/.test(raw) && /Path=\//.test(raw), 'cookie flags');
  check(!JSON.stringify(data).includes('REVIEW_SYNTHETIC_SIGNATURE'), 'login secret excluded');
  return { cookie: raw.split(';')[0], data };
}
async function socket(
  session: Session | undefined,
  opts: SocketOptions = {},
): Promise<SocketResult> {
  return await new Promise<SocketResult>((resolve) => {
    const s = io(origin + '/movie/all', {
      path: '/ws',
      forceNew: true,
      reconnection: false,
      timeout: 2500,
      transports: ['websocket'],
      extraHeaders: { origin, cookie: session?.cookie || '', ...opts.headers },
      auth: { csrf: session?.data.csrfToken, ...opts.auth },
    });
    clients.add(s);
    s.once('connect', () => resolve({ s, ok: true }));
    s.once('connect_error', (error) => {
      s.disconnect();
      resolve({ s, ok: false, error: error.message });
    });
  });
}
try {
  await new Promise<void>((resolve, reject) => {
    api.once('error', reject);
    api.listen(3211, '127.0.0.1', resolve);
  });
  await new Promise<void>((resolve, reject) => {
    wsServer.once('error', reject);
    wsServer.listen(3212, '127.0.0.1', resolve);
  });
  app = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: repo,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '3210',
      NUXT_APP_SECRET: secret,
      NUXT_API_UPSTREAM: 'http://127.0.0.1:3211',
      NUXT_SOCKET_UPSTREAM: 'http://127.0.0.1:3212',
      NUXT_TRUSTED_ORIGINS: origin,
      NUXT_SESSION_COOKIE_SECURE: 'false',
    },
    stdio: 'pipe',
  });
  app.stdout?.on('data', (c) => (logs += c));
  app.stderr?.on('data', (c) => (logs += c));
  for (let i = 0; i < 100; i++) {
    try {
      await req('/api/_auth/session');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const a = await login('alpha');
  const b = await login('beta');
  const pages = await Promise.all([req('/profile', a.cookie), req('/profile', b.cookie)]);
  const html = await Promise.all(pages.map((r) => r.text()));
  check(
    pages.every((r) => r.status === 200),
    'authenticated SSR200',
  );
  check(
    html[0].includes('alpha') &&
      !html[0].includes('beta@test.local') &&
      html[1].includes('beta') &&
      !html[1].includes('alpha@test.local'),
    'SSR identities isolated',
  );
  check(!html.join('').includes('REVIEW_SYNTHETIC_SIGNATURE'), 'no bearer SSR');
  const transport = await req('/ws/?EIO=4&transport=polling', a.cookie, {
    headers: { origin },
  });
  check(transport.status === 200, 'polling handshake');
  const sid = JSON.parse((await transport.text()).slice(1)).sid;
  const mismatch = await req('/ws/?EIO=4&transport=polling&sid=' + sid, b.cookie, {
    headers: { origin },
  });
  check(mismatch.status >= 400, 'polling SID rejects other session');
  const WebSocket = createRequire(require.resolve('engine.io'))('ws') as new (
    url: string,
    options: { headers: Record<string, string> },
  ) => UpgradeSocket;
  const rejectedUpgrade = await new Promise((resolve) => {
    const ws = new WebSocket(
      origin.replace('http:', 'ws:') + '/ws/?EIO=4&transport=websocket&sid=' + sid,
      { headers: { origin, cookie: b.cookie } },
    );
    const timer = setTimeout(() => {
      ws.terminate();
      resolve(false);
    }, 4000);
    ws.once('unexpected-response', (_request, response) => {
      clearTimeout(timer);
      response.resume();
      ws.terminate();
      resolve(response.statusCode === 403);
    });
    ws.once('open', () => {
      clearTimeout(timer);
      ws.close();
      resolve(false);
    });
    ws.on('error', () => {});
  });
  check(rejectedUpgrade, 'websocket upgrade SID rejects other session');

  const sessions = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      req('/api/_auth/session', i % 2 ? a.cookie : b.cookie).then((r) => r.json()),
    ),
  );
  check(
    sessions.every((d, i) => d.user.name === (i % 2 ? 'alpha' : 'beta')),
    'parallel session isolation',
  );
  const apiUsers = await Promise.all([req('/api/user', a.cookie), req('/api/user', b.cookie)]);
  check(
    (await apiUsers[0].json()).name === 'alpha' && (await apiUsers[1].json()).name === 'beta',
    'upstream user isolation',
  );
  for (const badOrigin of [undefined, 'null', 'http://evil.test', origin + '/']) {
    for (const path of ['/api/logout', '/api/_auth/session']) {
      const r = await req(path, a.cookie, {
        method: path.endsWith('logout') ? 'POST' : 'DELETE',
        headers: {
          ...(badOrigin ? { origin: badOrigin } : {}),
          host: '127.0.0.1:3210',
          'x-forwarded-host': '127.0.0.1:3210',
          'sec-fetch-site': 'same-origin',
          'x-csrf-token': a.data.csrfToken,
        },
      });
      check(r.status === 403, 'origin guard ' + path + ' ' + badOrigin);
    }
  }
  for (const path of ['/api/logout', '/api/_auth/session'])
    check(
      (
        await req(path, a.cookie, {
          method: path.endsWith('logout') ? 'POST' : 'DELETE',
          headers: { origin, 'x-csrf-token': 'wrong' },
        })
      ).status === 403,
      'bad csrf',
    );
  const forged = await req('/api/user', '', {
    headers: {
      authorization: records.find((r) => r.auth)?.auth || 'Bearer fake',
      'x-h3-session': a.cookie,
    },
  });
  check(forged.status === 401, 'header auth cannot bypass cookie');
  for (const path of ['/api/movie/error-test', '/api/movie/redirect-test']) {
    const r = await req(path, a.cookie);
    check(r.status === 502, 'upstream failure sanitized');
    check(!(await r.text()).includes('REVIEW_SYNTHETIC_SIGNATURE'), 'no token in error');
  }
  const before = records.length;
  for (const path of [
    '/api/restricted/user/a%252fadmin',
    '/api/movie/a%2fb',
    '/api/movie/a%5cb',
    '/api/https:%2f%2fevil.test',
  ])
    check((await req(path, a.cookie)).status >= 400, 'encoded path blocked');
  check(records.length === before, 'blocked paths never upstream');
  const good = await socket(a);
  check(good.ok, 'authenticated socket ' + good.error);
  const invalidSocketOptions: SocketOptions[] = [
    { headers: { origin: 'http://evil.test' } },
    { auth: { csrf: 'wrong' } },
    { headers: { cookie: '' } },
  ];
  for (const opts of invalidSocketOptions)
    check(!(await socket(a, opts)).ok, 'socket rejects missing credential/wrong origin/csrf');
  const rotated = await login('alpha', a.cookie);
  check((await req('/api/user', a.cookie)).status === 401, 'prior cookie revoked on login');
  await new Promise((r) => setTimeout(r, 100));
  check(!good.s.connected, 'login rotation disconnects old bridge');
  const newSocket = await socket(rotated);
  check(newSocket.ok, 'rotated socket');
  const logout = await req('/api/_auth/session', rotated.cookie, {
    method: 'DELETE',
    headers: { origin, 'x-csrf-token': rotated.data.csrfToken },
  });
  check(logout.status === 200, 'module logout accepted');
  await new Promise((r) => setTimeout(r, 100));
  check(!newSocket.s.connected, 'module clear hook disconnects bridge');
  check(
    (await req('/api/user', rotated.cookie)).status === 401,
    'module logout copied cookie replay denied',
  );
  const short = await login('short');
  const shortSocket = await socket(short);
  check(shortSocket.ok, 'short session socket');
  await new Promise((r) => setTimeout(r, 2300));
  check((await req('/api/user', short.cookie)).status === 401, 'exact JWT expiry enforced');
  check(!shortSocket.s.connected, 'expiry disconnects socket');
  check(
    !(await req('/api/_auth/session', short.cookie).then((r) => r.json())).user,
    'expired session projection empty',
  );
  const safe = await req('/api/_auth/session', b.cookie);
  check((safe.headers.get('cache-control') || '').includes('no-store'), 'session no store');
  check(!(await safe.text()).includes('REVIEW_SYNTHETIC_SIGNATURE'), 'session secret excluded');
  check(!logs.includes('REVIEW_SYNTHETIC_SIGNATURE'), 'no bearer in server logs');
  const revokedSocket = await socket(b);
  check(revokedSocket.ok, 'upstream401 fixture socket');
  check((await req('/api/movie/reject401', b.cookie)).status === 401, 'upstream401 propagated');
  await new Promise((r) => setTimeout(r, 100));
  check(!revokedSocket.s.connected, 'upstream401 closes bridge');
  check((await req('/api/user', b.cookie)).status === 401, 'upstream401 revokes subsequent access');
  const old = await login('race');
  const pending = req('/api/movie/late401', old.cookie);
  await new Promise((r) => setTimeout(r, 100));
  const newer = await login('race', old.cookie);
  const late = await pending;
  check(late.status === 401, 'old request401');
  check(!late.headers.get('set-cookie'), 'late401 never deletes newer browser cookie');
  check((await req('/api/user', newer.cookie)).status === 200, 'new login survives late401');
  check(upstreamClosed === upstreamCount, 'all bridges closed');
  console.log(
    JSON.stringify(
      {
        passed: successes,
        upstreamCount,
        upstreamClosed,
        notes:
          'Independent actual production Nitro runtime, synthetic HTTP and Socket.IO upstreams; no browser or real backend exercised.',
      },
      null,
      2,
    ),
  );
} catch (e) {
  // Never print captured server logs: a failed leak assertion must not expose credentials.
  console.error('Security smoke failed; captured server logs intentionally withheld.');
  throw e;
} finally {
  for (const client of clients) client.disconnect();
  app?.kill();
  await new Promise<void>((resolve) => sio.close(() => resolve()));
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
  wsServer.closeAllConnections();
  await new Promise<void>((resolve) => wsServer.close(() => resolve()));
}
