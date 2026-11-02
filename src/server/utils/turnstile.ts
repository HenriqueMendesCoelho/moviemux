import { createError, useRuntimeConfig } from 'nuxt/server';
import { trustedOrigins } from './security';

export type TurnstileAction = 'login' | 'signup' | 'password_recovery' | 'password_reset';
export const TURNSTILE_FIELD = 'cf-turnstile-response';
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

export function turnstileAction(path: string, method: string): TurnstileAction | undefined {
  if (method !== 'POST') return undefined;
  if (path === '/login') return 'login';
  if (path === '/public/user') return 'signup';
  if (path === '/public/user/password/reset') return 'password_recovery';
  if (/^\/public\/user\/password\/[a-zA-Z0-9]{200}\/reset$/.test(path)) return 'password_reset';
}

export function assertTurnstileMode() {
  const config = useRuntimeConfig();
  const enabled =
    config.public.turnstileEnabled !== false && String(config.public.turnstileEnabled) !== 'false';
  const origins = trustedOrigins(String(config.trustedOrigins || ''));
  const localOnly = [...origins].every((origin) => loopback.has(new URL(origin).hostname));
  if (!enabled) {
    if (!localOnly)
      throw createError({
        status: 503,
        message: 'Verification cannot be disabled for public origins',
      });
  }
  return { enabled, localOnly };
}

export function turnstileConfiguration() {
  const { enabled, localOnly } = assertTurnstileMode();
  if (!enabled) return { enabled: false as const, secret: '', hostnames: new Set<string>() };
  const config = useRuntimeConfig();
  const secret = String(config.turnstileSecret || '').trim();
  // Official deterministic test keys must never protect a publicly reachable deployment.
  const siteKey = String(config.public.turnstileSiteKey || '');
  if (!localOnly && (/^[123]x0{20,}A[A-Z]$/.test(secret) || /^[123]x0{15,}[A-Z]{2}$/.test(siteKey)))
    throw createError({
      status: 503,
      message: 'Test verification keys are restricted to loopback testing',
    });
  const hostnames = new Set(
    String(config.turnstileHostnames || '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean),
  );
  if (
    !secret ||
    !hostnames.size ||
    [...hostnames].some(
      (host) =>
        !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[::1\])$/.test(host) ||
        (!localOnly && loopback.has(host)),
    )
  )
    throw createError({ status: 503, message: 'Verification is not configured' });
  return { enabled: true as const, secret, hostnames };
}

export async function verifyTurnstile(token: unknown, action: TurnstileAction): Promise<void> {
  const config = turnstileConfiguration();
  if (!config.enabled) return;
  if (typeof token !== 'string' || !token.trim() || token.length > 2048)
    throw createError({ status: 403, message: 'Complete the security verification and try again' });
  let result: unknown;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: config.secret, response: token }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Verification unavailable');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty verification response');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new Error('Oversized verification response');
      }
      chunks.push(value);
    }
    result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw createError({
      status: 503,
      message: 'Security verification unavailable. Please try again',
    });
  }
  if (
    !result ||
    typeof result !== 'object' ||
    !('success' in result) ||
    result.success !== true ||
    !('action' in result) ||
    result.action !== action ||
    !('hostname' in result) ||
    typeof result.hostname !== 'string' ||
    !config.hostnames.has(result.hostname)
  ) {
    throw createError({ status: 403, message: 'Complete the security verification and try again' });
  }
}

/** Remove the browser proof before forwarding unchanged application fields to the legacy API. */
export async function protectedBody(
  body: string | undefined,
  contentType: string | undefined,
  action: TurnstileAction,
): Promise<string> {
  if (contentType === 'application/x-www-form-urlencoded') {
    const form = new URLSearchParams(body);
    const tokens = form.getAll(TURNSTILE_FIELD);
    form.delete(TURNSTILE_FIELD);
    await verifyTurnstile(tokens.length === 1 ? tokens[0] : undefined, action);
    return form.toString();
  }
  if (contentType !== 'application/json')
    throw createError({ status: 415, message: 'Unsupported request type' });
  let value: unknown;
  try {
    value = JSON.parse(body || '');
  } catch {
    throw createError({ status: 400, message: 'Invalid request body' });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createError({ status: 400, message: 'Invalid request body' });
  const payload = value as Record<string, unknown>;
  const token = payload[TURNSTILE_FIELD];
  delete payload[TURNSTILE_FIELD];
  await verifyTurnstile(token, action);
  return JSON.stringify(payload);
}
