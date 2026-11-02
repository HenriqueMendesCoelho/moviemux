import { timingSafeEqual } from 'node:crypto';
import { createError, useRuntimeConfig } from 'nuxt/server';

export function trustedOrigins(value: string): Set<string> {
  const values = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!values.length)
    throw createError({ status: 503, message: 'Trusted origins are not configured' });
  return new Set(
    values.map((entry) => {
      const url = new URL(entry);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.origin !== entry
      )
        throw createError({ status: 503, message: 'Invalid trusted origin configuration' });
      return url.origin;
    }),
  );
}
export function assertTrustedOrigin(
  headers: Headers,
  options: { allowMissingRead?: boolean } = {},
): void {
  const allowed = trustedOrigins(String(useRuntimeConfig().trustedOrigins || ''));
  const origin = headers.get('origin');
  if (origin && origin !== 'null' && allowed.has(origin)) return;
  if (!origin && options.allowMissingRead && headers.get('sec-fetch-site') === 'same-origin')
    return;
  throw createError({ status: 403, message: 'Request origin is not allowed' });
}
export function assertSessionCsrf(expected: string, received: unknown): void {
  if (typeof received !== 'string' || !expected || received.length > 128) {
    throw createError({ status: 403, message: 'Invalid request verification' });
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw createError({ status: 403, message: 'Invalid request verification' });
}
export function fixedUpstream(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createError({ status: 503, message: 'API upstream is not configured' });
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw createError({ status: 503, message: 'Invalid upstream configuration' });
  return url;
}
