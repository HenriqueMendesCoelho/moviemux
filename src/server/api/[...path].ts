import { defineEventHandler, createError, setResponseStatus } from 'nuxt/server';
import { protectedBody, turnstileAction } from '../utils/turnstile';
import { revokeSession } from '../utils/session-registry';
import { boundedBody } from '../utils/body';
import { allowedApiPath, upstreamRequest } from '../utils/upstream';
import { readActiveSession } from '../utils/session';
export default defineEventHandler(async (event) => {
  const path = event.url.pathname.slice(4);
  const method = event.req.method;
  if (!allowedApiPath(path, method))
    throw createError({ status: 404, message: 'API route not available' });
  const isPublic = path.startsWith('/public/');
  const session = isPublic ? undefined : await readActiveSession(event);
  const contentType = event.req.headers.get('content-type')?.split(';')[0];
  if (
    !['GET', 'HEAD'].includes(method) &&
    contentType &&
    !['application/json', 'application/x-www-form-urlencoded'].includes(contentType)
  )
    throw createError({ status: 415, message: 'Unsupported request type' });
  let body = ['GET', 'HEAD'].includes(method) ? undefined : await boundedBody(event);
  const action = turnstileAction(path, method);
  if (action) body = await protectedBody(body, contentType, action);
  try {
    const result = await upstreamRequest(path + event.url.search, {
      method,
      body: body || undefined,
      contentType,
      token: session?.secure.accessToken,
    });
    setResponseStatus(event, result.status);
    return result.status === 204 ? null : result.data;
  } catch (error) {
    // A late401 must not delete a newer login's cookie. Revoke only this request's generation.
    if (session && typeof error === 'object' && error && 'status' in error && error.status === 401)
      revokeSession(session.user.generation, session.user.expiresAt);
    throw error;
  }
});
