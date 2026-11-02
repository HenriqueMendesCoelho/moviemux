/** Exercise the exact Docker probe and built Nitro liveness route with isolated local fixtures. */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root = process.env.MOVIEMUX_REPO || process.cwd();
const probePath = resolve(root, 'scripts/healthcheck.ts');
const env: NodeJS.ProcessEnv = { ...process.env };
for (const name of [
  'NITRO_PORT',
  'PORT',
  'NITRO_HOST',
  'HOST',
  'NITRO_UNIX_SOCKET',
  'NITRO_SSL_CERT',
  'NITRO_SSL_KEY',
  'NODE_OPTIONS',
  'NODE_TLS_REJECT_UNAUTHORIZED',
])
  delete env[name];
let assertions = 0;
function check(value: unknown, label: string): asserts value {
  assert.ok(value, label);
  assertions++;
}
async function probe(overrides: NodeJS.ProcessEnv, script = probePath) {
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: { ...env, ...overrides },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let text = '';
  child.stdout.on('data', (chunk) => {
    text += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    text += String(chunk);
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), 6000);
  const [code] = (await once(child, 'exit')) as [number | null];
  clearTimeout(timer);
  check(code !== null, 'probe exits within external six-second bound');
  check(!text.includes('SYNTHETIC_PRIVATE_DIAGNOSTIC'), 'probe does not echo server diagnostics');
  return code;
}
async function listen(server: Server, host = '127.0.0.1') {
  server.listen(0, host);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return address.port;
}
async function stopServer(server: Server) {
  server.closeAllConnections();
  if (server.listening) await new Promise<void>((done) => server.close(() => done()));
}
let mode = 'ok';
let observedPath = '';
const server = createServer((request, response) => {
  observedPath = request.url || '';
  if (mode === 'timeout') return;
  response.setHeader('content-type', mode === 'html' ? 'text/html' : 'application/json');
  if (mode === 'unhealthy') response.statusCode = 503;
  if (mode === 'redirect') {
    response.statusCode = 302;
    response.setHeader('location', '/healthz');
  }
  response.end(
    mode === 'wrong'
      ? '{"status":"bad"}'
      : mode === 'large'
        ? JSON.stringify({ status: 'ok', data: 'x'.repeat(2000) })
        : mode === 'malformed'
          ? 'SYNTHETIC_PRIVATE_DIAGNOSTIC'
          : mode === 'html'
            ? '<html>healthy-looking fallback</html>'
            : '{"status":"ok"}',
  );
});
let app: ChildProcess | undefined;
let socketServer: Server | undefined;
let ipv6Server: Server | undefined;
let directory: string | undefined;
try {
  const port = await listen(server);
  directory = await mkdtemp(join(tmpdir(), 'moviemux-health-'));
  const standaloneProbe = join(directory, 'healthcheck.ts');
  await copyFile(probePath, standaloneProbe);
  check(
    (await probe({ PORT: String(port) }, standaloneProbe)) === 0,
    'Node runs copied standalone TS probe outside project package scope like Docker',
  );
  check(
    (await probe({ PORT: String(port), NITRO_SSL_CERT: 'synthetic-not-a-certificate' })) === 0,
    'partial TLS configuration retains HTTP, matching Nitro',
  );
  check(
    (await probe({
      PORT: String(port),
      NITRO_SSL_CERT: 'synthetic-cert',
      NITRO_SSL_KEY: 'synthetic-key',
    })) !== 0,
    'both TLS variables select HTTPS rather than accidentally accepting plaintext',
  );
  check(
    (await probe({ PORT: String(port), HOST: '127.0.0.1' })) === 0,
    'PORT/HOST successful probe',
  );
  check(observedPath === '/healthz', 'dedicated health path requested');
  check(
    (await probe({
      PORT: '1',
      NITRO_PORT: String(port),
      HOST: 'bad.invalid',
      NITRO_HOST: '0.0.0.0',
    })) === 0,
    'NITRO host/port take precedence and IPv4 wildcard becomes loopback',
  );
  for (const failure of ['unhealthy', 'redirect', 'wrong', 'malformed', 'html', 'large']) {
    mode = failure;
    check((await probe({ PORT: String(port) })) !== 0, `${failure} fails health probe`);
  }
  mode = 'timeout';
  const started = Date.now();
  check((await probe({ PORT: String(port) })) !== 0, 'unresponsive server fails');
  check(Date.now() - started < 5500, 'absolute deadline is below Docker timeout');
  mode = 'ok';
  for (const invalid of ['0', '-1', '65536', 'not-a-port'])
    check((await probe({ PORT: invalid })) !== 0, `invalid port ${invalid} fails closed`);
  await stopServer(server);
  check((await probe({ PORT: String(port) })) !== 0, 'connection refusal fails probe');

  ipv6Server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end('{"status":"ok"}');
  });
  try {
    const ipv6Port = await listen(ipv6Server, '::1');
    check(
      (await probe({ NITRO_HOST: '::', NITRO_PORT: String(ipv6Port) })) === 0,
      'IPv6 wildcard targets IPv6 loopback',
    );
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      ['EAFNOSUPPORT', 'EADDRNOTAVAIL', 'EPERM'].includes(String(error.code))
    ))
      throw error;
    console.log('SKIP IPv6 transport unavailable in this executor');
  }
  await stopServer(ipv6Server);

  const socketPath = join(directory, 'http.sock');
  socketServer = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end('{"status":"ok"}');
  });
  try {
    socketServer.listen(socketPath);
    await once(socketServer, 'listening');
    check(
      (await probe({ NITRO_UNIX_SOCKET: socketPath, PORT: '1' })) === 0,
      'configured Unix socket works without TCP port',
    );
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      ['EPERM', 'EACCES', 'ENOTSUP'].includes(String(error.code))
    ))
      throw error;
    console.log('SKIP Unix socket unavailable in this executor');
  }
  await stopServer(socketServer);

  if (!process.argv.includes('--probe-only')) {
    const appPort = 3240;
    const origin = `http://127.0.0.1:${appPort}`;
    app = spawn(process.execPath, ['.output/server/index.mjs'], {
      cwd: root,
      env: {
        ...env,
        NODE_ENV: 'production',
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: String(appPort),
        NUXT_APP_SECRET: randomBytes(48).toString('base64url'),
        NUXT_TRUSTED_ORIGINS: origin,
        NUXT_API_UPSTREAM: '',
        NUXT_SOCKET_UPSTREAM: '',
        NUXT_TURNSTILE_SECRET: '',
        NUXT_TURNSTILE_HOSTNAMES: '',
        NUXT_PUBLIC_TURNSTILE_ENABLED: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    app.stdout?.on('data', (chunk) => {
      logs += String(chunk);
    });
    app.stderr?.on('data', (chunk) => {
      logs += String(chunk);
    });
    let response: Response | undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (app.exitCode !== null) throw new Error(`Nuxt exited before health check: ${logs}`);
      try {
        response = await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) });
        if (response.status === 200) break;
      } catch {
        /* Wait only for disposable server startup. */
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    check(response?.status === 200, 'actual production Nitro health route responds');
    assert.deepEqual(await response.json(), { status: 'ok' });
    assertions++;
    check(
      (response.headers.get('cache-control') || '').includes('no-store'),
      'health response not cached',
    );
    check(!response.headers.has('set-cookie'), 'health does not create a session cookie');
    check(
      (await probe({ NITRO_PORT: String(appPort), NITRO_HOST: '127.0.0.1' })) === 0,
      'exact Docker command succeeds against built Nuxt without upstream or Turnstile config',
    );
    const login = await fetch(`${origin}/api/login`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'health-fixture@example.invalid', password: 'synthetic-only' }),
    });
    check(
      login.status === 503,
      'unconfigured protected login remains fail-closed while liveness is healthy',
    );
    app.kill();
    await once(app, 'exit');
    app = undefined;
    check(
      (await probe({ PORT: String(appPort) })) !== 0,
      'exact command fails after actual Nuxt stops',
    );
  }
  console.log(
    `PASS ${assertions} Docker health probe assertions; liveness only, not upstream readiness. Docker image execution not exercised.`,
  );
} finally {
  app?.kill();
  await stopServer(server);
  if (ipv6Server) await stopServer(ipv6Server);
  if (socketServer) await stopServer(socketServer);
  if (directory) await rm(directory, { recursive: true, force: true });
}
