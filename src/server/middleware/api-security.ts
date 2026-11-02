import { defineEventHandler, createError } from 'nuxt/server';
import { getUserSession } from '#auth-server';
import { assertTrustedOrigin, assertSessionCsrf } from '../utils/security';
export default defineEventHandler(async (event) => {
  // Engine.IO owns this stream. Accessing portable event.req eagerly consumes polling POST bodies.
  // The bridge separately enforces Origin, cookie, session-generation and namespace CSRF checks.
  if (event.url.pathname === '/ws' || event.url.pathname.startsWith('/ws/')) return;
  if (!event.url.pathname.startsWith('/api/')) {
    if (event.req.headers.get('accept')?.includes('text/html')) {
      event.res.headers.set('cache-control', 'no-store, private');
      event.res.headers.append('vary', 'Cookie');
    }
    return;
  }
  event.res.headers.set('cache-control', 'no-store, private');
  event.res.headers.set('pragma', 'no-cache');
  event.res.headers.set('x-content-type-options', 'nosniff');
  event.res.headers.append('vary', 'Cookie');
  if (['GET', 'HEAD'].includes(event.req.method)) return;
  if (event.req.method === 'OPTIONS')
    throw createError({ status: 403, message: 'Cross-origin API access is not supported' });
  assertTrustedOrigin(event.req.headers);
  const path = event.url.pathname;
  if (path === '/api/login' || path.startsWith('/api/public/')) return;
  const session = await getUserSession(event);
  // Expired-session logout remains possible: validate its sealed nonce, not JWT validity.
  if (typeof session.csrfToken !== 'string') {
    if (path === '/api/logout' || path === '/api/_auth/session') return;
    throw createError({ status: 401, message: 'Session expired' });
  }
  assertSessionCsrf(session.csrfToken, event.req.headers.get('x-csrf-token'));
});
