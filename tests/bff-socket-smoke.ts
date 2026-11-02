/** Production BFF regression against ephemeral, loopback-only HTTP/Socket.IO fixtures.
 * Run after `pnpm build`: `node tests/bff-socket-smoke.ts` (Node 26).
 * Uses independent Node clients, never browser automation or production credentials.
 */
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { once as onceEvent } from 'node:events';
import { createServer, request as httpRequest, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url));
await access(output);
const fixtureSecret = randomBytes(48).toString('hex');
const tokens = new Map<string, { name: string }>();
const cookies = new Set<string>();
const sockets: Socket[] = [];
const checks: string[] = [];
const serverLogs: string[] = [];
const roomA = '00000000-0000-4000-8000-000000000001';
const roomB = '00000000-0000-4000-8000-000000000002';
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
interface Session {
  csrfToken: string;
  cookie: string;
}
async function listen(server: HttpServer): Promise<number> {
  server.listen(0, '127.0.0.1');
  await onceEvent(server, 'listening');
  return (server.address() as AddressInfo).port;
}
async function unusedPort(): Promise<number> {
  const reservation = createServer();
  const port = await listen(reservation);
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  return port;
}
function fixtureJwt(email: string): string {
  const payload = {
    id: email.startsWith('a') ? roomA : roomB,
    name: email,
    sub: email,
    roles: ['USER'],
    exp: Math.floor(Date.now() / 1000) + (email.startsWith('short') ? 3 : 120),
  };
  const prefix =
    Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url') +
    '.' +
    Buffer.from(JSON.stringify(payload)).toString('base64url');
  const token =
    prefix + '.' + createHmac('sha256', fixtureSecret).update(prefix).digest('base64url');
  tokens.set(token, { name: email });
  return token;
}
function redact(value: string): string {
  for (const secret of [fixtureSecret, ...tokens.keys(), ...cookies])
    value = value.replaceAll(secret, '[redacted]');
  return value;
}
function event<T = unknown>(socket: Socket, name: string, timeout = 6_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (value: T) => {
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      socket.off(name, handler);
      reject(new Error(`Timeout: ${name}`));
    }, timeout);
    socket.once(name, handler);
  });
}
async function connected(socket: Socket): Promise<Socket> {
  await new Promise<void>((resolve, reject) => {
    const clear = () => {
      clearTimeout(timer);
      socket.off('connect', success);
      socket.off('connect_error', failure);
    };
    const success = () => {
      clear();
      resolve();
    };
    const failure = () => {
      clear();
      reject(new Error('Unexpected namespace authentication failure'));
    };
    const timer = setTimeout(() => {
      clear();
      reject(new Error('Namespace connection timeout'));
    }, 8_000);
    socket.once('connect', success);
    socket.once('connect_error', failure);
    socket.connect();
  });
  return socket;
}
const api = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += String(chunk);
  response.setHeader('content-type', 'application/json');
  if (request.url === '/api/login') {
    const input = JSON.parse(body) as { email: string };
    response.end(
      JSON.stringify({
        access_token: fixtureJwt(input.email),
        expires: new Date(Date.now() + 120_000).toISOString(),
      }),
    );
  } else {
    response.statusCode = 404;
    response.end('{}');
  }
});
const apiPort = await listen(api);
const socketHttp = createServer();
const upstream = new Server(socketHttp, { path: '/ws' });
const upstreamPort = await listen(socketHttp);
const seenTokens: string[] = [];
let forbiddenRelays = 0;
for (const namespace of ['/movie/all', '/movie/note']) {
  const channel = upstream.of(namespace);
  channel.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    seenTokens.push(token);
    const user = tokens.get(token);
    if (!user) {
      next(new Error('not authorized'));
      return;
    }
    if (user.name.startsWith('slow')) setTimeout(() => next(), 800);
    else next();
  });
  channel.on('connection', (socket) => {
    socket.on('join-room', ({ room }: { room: string }) => {
      void socket.join(room);
    });
    socket.on('leave-room', ({ room }: { room: string }) => {
      void socket.leave(room);
    });
    socket.on('forbidden-client-event', () => {
      forbiddenRelays++;
    });
  });
}
const port = await unusedPort();
const base = `http://127.0.0.1:${port}`;
function startServer() {
  const child = spawn(process.execPath, [output], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOST: '127.0.0.1',
      NUXT_APP_SECRET: fixtureSecret,
      NUXT_API_UPSTREAM: `http://127.0.0.1:${apiPort}/api`,
      NUXT_SOCKET_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
      NUXT_TRUSTED_ORIGINS: base,
      NUXT_SESSION_COOKIE_SECURE: 'false',
    },
  });
  child.stdout.on('data', (data: Buffer) => serverLogs.push(data.toString()));
  child.stderr.on('data', (data: Buffer) => serverLogs.push(data.toString()));
  return child;
}
let server = startServer();
async function stopServer() {
  if (server.exitCode !== null) return;
  const stopped = onceEvent(server, 'exit');
  server.kill('SIGTERM');
  const timer = setTimeout(() => {
    if (server.exitCode === null) server.kill('SIGKILL');
  }, 5_000);
  await stopped;
  clearTimeout(timer);
}
async function login(email: string): Promise<Session> {
  const response = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Synthetic local fixture' }),
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(response.status, 200, 'Fixture login succeeds');
  const text = await response.text();
  for (const token of tokens.keys())
    assert.ok(!text.includes(token), 'JWT must not appear in login response');
  assert.ok(!text.includes('access_token'));
  const result = JSON.parse(text) as { csrfToken: string };
  const headers = response.headers
    .getSetCookie()
    .filter((value) => value.startsWith('moviemux-session='));
  assert.ok(
    headers.length && headers.every((value) => /HttpOnly/i.test(value)),
    'Session cookies are HttpOnly',
  );
  const cookie = headers.map((value) => value.split(';')[0]).join('; ');
  cookies.add(cookie);
  return { csrfToken: result.csrfToken, cookie };
}
function client(
  session: Session,
  namespace = '/movie/note',
  transports: ('polling' | 'websocket')[] = ['websocket'],
  overrides: { auth?: Record<string, string>; extraHeaders?: Record<string, string> } = {},
): Socket {
  const socket = io(base + namespace, {
    path: '/ws',
    forceNew: true,
    autoConnect: false,
    reconnection: false,
    transports,
    extraHeaders: { Origin: base, Cookie: session.cookie },
    auth: { csrf: session.csrfToken },
    ...overrides,
  });
  sockets.push(socket);
  return socket;
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error('Production BFF exited during startup');
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(500) });
      if (response.status < 500) {
        ready = true;
        break;
      }
    } catch {
      /* bounded startup polling */
    }
    await pause(200);
  }
  assert.ok(ready, 'Production BFF becomes ready');
  const a = await login('a@fixture.test'),
    b = await login('b@fixture.test');
  const sa = await connected(client(a)),
    sb = await connected(client(b));
  assert.ok(seenTokens.length >= 2 && seenTokens.every((token) => tokens.has(token)));
  checks.push('HttpOnly sessions and server-only upstream JWT authentication');
  sa.emit('join-room', { room: roomA });
  sb.emit('join-room', { room: roomB });
  await pause(120);
  let otherEvents = 0;
  sb.on('create-note', () => {
    otherEvents++;
  });
  const note = event<{ content: { note: number } }>(sa, 'create-note');
  upstream
    .of('/movie/note')
    .to(roomA)
    .emit('create-note', {
      movie: roomA,
      event: 'create-note',
      content: { note: 0, user: { id: roomA, name: 'Fixture' } },
    });
  assert.equal((await note).content.note, 0);
  await pause(80);
  assert.equal(otherEvents, 0);
  checks.push('Rating zero and isolated room subscriptions');
  sa.emit('forbidden-client-event', {});
  await pause(80);
  assert.equal(forbiddenRelays, 0);
  checks.push('Unlisted browser events are not relayed');
  for (const [name, overrides] of [
    ['csrf', { auth: { csrf: 'wrong' } }],
    ['origin', { extraHeaders: { Origin: 'https://attacker.invalid', Cookie: a.cookie } }],
    ['cookie', { extraHeaders: { Origin: base, Cookie: 'moviemux-session=invalid' } }],
  ] as const) {
    const socket = client(a, '/movie/note', ['websocket'], overrides);
    const rejection = event(socket, 'connect_error');
    socket.connect();
    await rejection;
    assert.equal(socket.connected, false);
    socket.disconnect();
    checks.push(`Direct WebSocket rejects invalid ${name}`);
  }
  const polling = await connected(client(a, '/movie/all', ['polling']));
  const sid = polling.io.engine.id;
  const swapped = await fetch(`${base}/ws/?EIO=4&transport=polling&sid=${sid}`, {
    headers: { Origin: base, Cookie: b.cookie },
    signal: AbortSignal.timeout(2_000),
  });
  assert.ok(swapped.status >= 400);
  assert.equal(polling.connected, true);
  checks.push('Polling namespace works and rejects cross-session SID reuse');
  const upgradeStatus = await new Promise<number | undefined>((resolve, reject) => {
    const request = httpRequest(`${base}/ws/?EIO=4&transport=websocket&sid=${sid}`, {
      headers: {
        Origin: base,
        Cookie: b.cookie,
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
      },
    });
    const timer = setTimeout(() => {
      request.destroy();
      reject(new Error('Upgrade rejection timeout'));
    }, 3_000);
    request.on('response', (response) => {
      clearTimeout(timer);
      response.resume();
      resolve(response.statusCode);
    });
    request.on('upgrade', (_response, socket) => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error('Cross-session upgrade was accepted'));
    });
    request.on('error', () => {
      clearTimeout(timer);
      reject(new Error('Unexpected upgrade request error'));
    });
    request.end();
  });
  assert.equal(upgradeStatus, 403);
  checks.push('WebSocket upgrade rejects cross-session SID reuse');
  const upstreamA = [...upstream.of('/movie/note').sockets.values()].find(
    (socket) => tokens.get(socket.handshake.auth.token as string)?.name === 'a@fixture.test',
  );
  assert.ok(upstreamA);
  const lost = event<{ connected: boolean }>(sa, 'bridge:upstream');
  upstreamA.conn.close();
  assert.equal((await lost).connected, false);
  assert.equal(
    (await event<{ connected: boolean }>(sa, 'bridge:upstream', 10_000)).connected,
    true,
  );
  await pause(100);
  const restored = event<{ content: { note: number } }>(sa, 'update-note');
  upstream
    .of('/movie/note')
    .to(roomA)
    .emit('update-note', { movie: roomA, event: 'update-note', content: { note: 0 } });
  assert.equal((await restored).content.note, 0);
  checks.push('Upstream reconnect signals fail-closed state and rejoins once');
  const ended = [event(sa, 'bridge:session-ended'), event(polling, 'bridge:session-ended')];
  const logout = await fetch(`${base}/api/logout`, {
    method: 'POST',
    headers: { Origin: base, Cookie: a.cookie, 'x-csrf-token': a.csrfToken },
  });
  assert.equal(logout.status, 200);
  await Promise.all(ended);
  await pause(80);
  assert.equal(sa.connected, false);
  assert.equal(polling.connected, false);
  assert.equal(sb.connected, true);
  checks.push('Logout closes all matching namespaces, preserving another session');
  const replay = client(a),
    rejected = event(replay, 'connect_error');
  replay.connect();
  await rejected;
  replay.disconnect();
  checks.push('Revoked cookie cannot reconnect');
  const slow = await login('slow@fixture.test'),
    pending = client(slow);
  pending.connect();
  await pause(100);
  pending.disconnect();
  await pause(1_000);
  assert.equal(
    [...upstream.of('/movie/note').sockets.values()].filter(
      (socket) => tokens.get(socket.handshake.auth.token as string)?.name === 'slow@fixture.test',
    ).length,
    0,
  );
  checks.push('Canceled handshake leaves no upstream connection');
  const short = await login('short@fixture.test'),
    expiring = await connected(client(short));
  await event(expiring, 'bridge:session-ended', 5_000);
  await pause(80);
  assert.equal(expiring.connected, false);
  checks.push('Absolute session expiry closes realtime transport');
  const restarting = client(b);
  restarting.io.reconnection(true).reconnectionDelay(100).reconnectionDelayMax(200);
  restarting.on('connect', () => restarting.emit('join-room', { room: roomB }));
  await connected(restarting);
  const interrupted = event<string>(restarting, 'disconnect');
  await stopServer();
  assert.notEqual(await interrupted, 'io server disconnect');
  assert.equal(restarting.active, true, 'Restart leaves automatic reconnect enabled');
  const reconnected = event(restarting, 'connect', 10_000);
  server = startServer();
  await reconnected;
  await pause(120);
  const afterRestart = event<{ content: { note: number } }>(restarting, 'create-note');
  upstream
    .of('/movie/note')
    .to(roomB)
    .emit('create-note', {
      movie: roomB,
      event: 'create-note',
      content: { note: 0 },
    });
  assert.equal((await afterRestart).content.note, 0);
  checks.push(
    'Graceful BFF restart automatically reconnects unchanged cookie session and rejoins room',
  );
  const loggedOut = event(restarting, 'disconnect');
  assert.equal(
    (
      await fetch(`${base}/api/logout`, {
        method: 'POST',
        headers: { Origin: base, Cookie: b.cookie, 'x-csrf-token': b.csrfToken },
      })
    ).status,
    200,
  );
  assert.equal(await loggedOut, 'io server disconnect');
  assert.equal(restarting.active, false, 'Logout must not automatically reconnect');
  checks.push('Logout still permanently disconnects automatic-reconnect clients after restart');
  console.log(
    `PASS: ${checks.length} production BFF socket/security checks; synthetic local upstreams only.`,
  );
} catch (error) {
  console.error(redact(String(error)));
  console.error(redact(serverLogs.join('').slice(-3_000)));
  process.exitCode = 1;
} finally {
  sockets.forEach((socket) => socket.disconnect());
  await new Promise<void>((resolve) => upstream.close(() => resolve()));
  await new Promise<void>((resolve) => api.close(() => resolve()));
  await stopServer();
}
