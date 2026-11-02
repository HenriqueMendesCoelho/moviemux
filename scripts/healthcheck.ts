/** Container-local liveness probe. Uses only the Node runtime bundled in the image. */
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const deadlineMs = 4000;
const maximumBytes = 1024;
function probe(): Promise<void> {
  const port = Number(process.env.NITRO_PORT || process.env.PORT || 3000);
  const socketPath = process.env.NITRO_UNIX_SOCKET || undefined;
  if (!socketPath && (!Number.isInteger(port) || port < 1 || port > 65535))
    return Promise.reject(new Error('Invalid listen port'));
  const bindHost = process.env.NITRO_HOST || process.env.HOST || '0.0.0.0';
  const hostname =
    bindHost === '0.0.0.0'
      ? '127.0.0.1'
      : bindHost === '::' || bindHost === '[::]'
        ? '::1'
        : bindHost.replace(/^\[|\]$/g, '');
  const request =
    process.env.NITRO_SSL_CERT && process.env.NITRO_SSL_KEY ? httpsRequest : httpRequest;
  return new Promise<void>((resolve, reject) => {
    const req = request(
      {
        hostname,
        port,
        socketPath,
        path: '/healthz',
        method: 'GET',
        headers: { accept: 'application/json' },
        agent: false,
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.destroy();
          finish(new Error('Unhealthy response'));
          return;
        }
        let bytes = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maximumBytes) {
            response.destroy();
            finish(new Error('Unexpected response'));
          } else chunks.push(chunk);
        });
        response.on('error', finish);
        response.on('end', () => {
          try {
            const result: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (
              !response.headers['content-type']?.startsWith('application/json') ||
              !result ||
              typeof result !== 'object' ||
              !('status' in result) ||
              result.status !== 'ok'
            )
              throw new Error('Unexpected response');
            finish();
          } catch {
            finish(new Error('Unexpected response'));
          }
        });
      },
    );
    let settled = false;
    const timer = setTimeout(() => {
      req.destroy();
      finish(new Error('Health probe timed out'));
    }, deadlineMs);
    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    }
    req.on('error', finish);
    req.end();
  });
}
try {
  await probe();
} catch {
  // Never expose environment values, response contents or connection diagnostics in health logs.
  console.error('Frontend liveness check failed');
  process.exitCode = 1;
}
