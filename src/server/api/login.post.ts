import { verifyTurnstile, TURNSTILE_FIELD } from '../utils/turnstile';
import { randomBytes } from 'node:crypto';
import { defineEventHandler, createError, deleteCookie } from 'nuxt/server';
import { clearUserSession, replaceUserSession } from '#auth-server';
import { boundedBody } from '../utils/body';
import { upstreamRequest } from '../utils/upstream';
import { publicSession, safeClaimsFromUpstream } from '../utils/session';
export default defineEventHandler(async (event) => {
  let input: { email?: unknown; password?: unknown; [TURNSTILE_FIELD]?: unknown };
  try {
    input = JSON.parse(await boundedBody(event, 8192));
  } catch {
    throw createError({ status: 400, message: 'Invalid login request' });
  }
  if (
    typeof input?.email !== 'string' ||
    input.email.length > 254 ||
    typeof input.password !== 'string' ||
    input.password.length > 1024
  )
    throw createError({ status: 400, message: 'Invalid login request' });
  await verifyTurnstile(input[TURNSTILE_FIELD], 'login');
  const response = await upstreamRequest('/login', {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  const token = (response.data as { access_token?: unknown })?.access_token;
  if (typeof token !== 'string')
    throw createError({ status: 502, message: 'Invalid authentication response' });
  const user = safeClaimsFromUpstream(token);
  // Clear revokes the previous generation and rotates the underlying library session ID.
  await clearUserSession(event);
  const session = {
    user,
    secure: { accessToken: token },
    csrfToken: randomBytes(24).toString('base64url'),
  };
  await replaceUserSession(event, session, {
    maxAge: Math.max(1, Math.floor((user.expiresAt - Date.now()) / 1000)),
  });
  deleteCookie(event, 'auth-kb', { path: '/' });
  return publicSession(session);
});
