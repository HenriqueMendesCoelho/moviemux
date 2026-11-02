/** Local-only integration smoke. Run with Node 26: node tests/dev-proxy-smoke.ts. */
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const upstream = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      method: request.method,
      path: request.url,
      headers: request.headers,
      body: Buffer.concat(chunks).toString('utf8'),
    }),
  );
});
upstream.listen(0, '127.0.0.1');
await once(upstream, 'listening');
const upstreamAddress = upstream.address();
assert(upstreamAddress && typeof upstreamAddress === 'object');
const origin = `http://127.0.0.1:${upstreamAddress.port}`;
const reserve = createServer();
reserve.listen(0, '127.0.0.1');
await once(reserve, 'listening');
const address = reserve.address();
assert(address && typeof address === 'object');
const port = address.port;
await new Promise<void>((resolveClose) => reserve.close(() => resolveClose()));
const browserOrigin = `http://127.0.0.1:${port}`;
const cwd = fileURLToPath(new URL('..', import.meta.url));
const env = {
  ...process.env,
  NODE_ENV: 'development',
  MOVIEMUX_DEV_API_ORIGIN: origin,
  NUXT_TELEMETRY_DISABLED: '1',
};
delete env.NUXT_PUBLIC_API_URL;
let output = '';
const dev = spawn(
  process.execPath,
  [
    resolve(cwd, 'node_modules/nuxt/bin/nuxt.mjs'),
    'dev',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] },
);
dev.stdout.on('data', (chunk) => {
  output += String(chunk);
});
dev.stderr.on('data', (chunk) => {
  output += String(chunk);
});
try {
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (dev.exitCode !== null)
      throw new Error(`Nuxt dev exited ${dev.exitCode}\n${output.slice(-5000)}`);
    try {
      const response = await fetch(`${browserOrigin}/api/ready`, {
        signal: AbortSignal.timeout(1000),
      });
      const result = (await response.json()) as { path?: string };
      if (response.ok && result.path === '/api/ready') {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the actual dev server to bind its proxy. */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  assert(ready, `Nuxt proxy did not become ready.\n${output.slice(-5000)}`);
  const body = 'name=Henrique+Mendes&email=test%2Bqa%40example.invalid&notify=true';
  const path = '/api/monolith/user/update?source=smoke%20test';
  const response = await fetch(`${browserOrigin}${path}`, {
    method: 'PATCH',
    headers: {
      authorization: 'Bearer synthetic-local-smoke-token',
      origin: browserOrigin,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  assert.equal(response.status, 200);
  const echoed = (await response.json()) as {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string;
  };
  assert.equal(echoed.method, 'PATCH');
  assert.equal(echoed.path, path);
  assert.equal(echoed.body, body);
  assert.equal(echoed.headers.authorization, 'Bearer synthetic-local-smoke-token');
  assert.equal(echoed.headers.origin, origin);
  assert.equal(echoed.headers.host, new URL(origin).host);
  assert.equal(echoed.headers['content-type'], 'application/x-www-form-urlencoded');
  console.log(
    JSON.stringify({
      passed: true,
      runtime: process.version,
      checks: [
        'actual Nuxt dev proxy',
        'PATCH method',
        '/api prefix and encoded query',
        'encoded form body',
        'Authorization preserved',
        'Origin rewritten to gateway origin',
        'Host rewritten',
      ],
      upstream: origin,
      frontend: browserOrigin,
    }),
  );
} finally {
  dev.kill('SIGTERM');
  await Promise.race([
    once(dev, 'exit'),
    new Promise((resolveWait) => setTimeout(resolveWait, 5000)),
  ]);
  if (dev.exitCode === null) dev.kill('SIGKILL');
  upstream.closeAllConnections();
  await new Promise<void>((resolveClose) => upstream.close(() => resolveClose()));
}
