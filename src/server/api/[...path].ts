import { defineEventHandler, createError, setResponseStatus } from 'nuxt/server';
import type { H3Event } from 'h3';
import { protectedBody, turnstileAction } from '../utils/turnstile';
import { revokeSession } from '../utils/session-registry';
import { boundedBody } from '../utils/body';
import { collectionContractPath } from '../utils/collection-contract-path';
import {
  ensureRepeatedRoundReadBodyless,
  invalidRepeatedRoundRequest,
  REPEATED_ROUND_BODY_LIMIT,
  repeatedRoundOperation,
} from '../utils/repeated-round-contract';
import {
  invalidVisibilitySettings,
  RANKING_VISIBILITY_BODY_LIMIT,
  rankingVisibilityOperation,
} from '../utils/ranking-visibility-contract';
import { rankingRequestBody } from '../utils/ranking-requests';
import {
  allowedApiPath,
  assertRankingReadQuery,
  assertRankingReadIntent,
  isRankingJoin,
  upstreamRequest,
} from '../utils/upstream';
import { readActiveSession } from '../utils/session';
export default defineEventHandler(async (event) => {
  const path = event.url.pathname.slice(4);
  const method = event.req.method;
  if (!allowedApiPath(path, method))
    throw createError({ status: 404, message: 'API route not available' });
  const isPublic = path.startsWith('/public/');
  const logical = collectionContractPath(path);
  const repeated = repeatedRoundOperation(logical, method);
  const visibility = rankingVisibilityOperation(logical, method);
  // Nitro's portable event also proxies its underlying H3 node context.
  const native = (event as typeof event & Partial<Pick<H3Event, 'node'>>).node;
  const rawUrl = native?.req.originalUrl ?? native?.req.url;
  if (visibility && rawUrl !== undefined && rawUrl.split('?', 1)[0] !== `/api${path}`)
    throw createError({ status: 404, message: 'API route not available' });
  const session = isPublic ? undefined : await readActiveSession(event);
  assertRankingReadQuery(
    path,
    method,
    event.url.searchParams,
    (visibility ? rawUrl ?? event.url.href : event.url.href).includes('?'),
  );
  assertRankingReadIntent(path, method, event.req.headers);
  if (
    visibility === 'read' &&
    (event.req.headers.has('transfer-encoding') ||
      (event.req.headers.has('content-length') && event.req.headers.get('content-length') !== '0') ||
      event.req.body != null)
  )
    invalidVisibilitySettings();
  if (repeated)
    ensureRepeatedRoundReadBodyless(
      repeated,
      event.req.headers.get('content-length'),
      event.req.headers.get('transfer-encoding'),
    );
  const contentType =
    repeated === 'read-settings' || visibility === 'read' || isRankingJoin(path, method)
      ? undefined
      : event.req.headers.get('content-type')?.split(';')[0];
  if (
    !visibility &&
    !['GET', 'HEAD'].includes(method) &&
    contentType &&
    !['application/json', 'application/x-www-form-urlencoded'].includes(contentType)
  )
    throw createError({ status: 415, message: 'Unsupported request type' });
  let body: string | undefined;
  if (visibility === 'write') {
    try {
      body = await boundedBody(event, RANKING_VISIBILITY_BODY_LIMIT, true);
    } catch {
      invalidVisibilitySettings();
    }
  } else if (repeated && repeated !== 'read-settings') {
    try {
      body = await boundedBody(event, REPEATED_ROUND_BODY_LIMIT, true);
    } catch {
      invalidRepeatedRoundRequest(repeated);
    }
  } else if (!['GET', 'HEAD'].includes(method)) body = await boundedBody(event);
  body = rankingRequestBody(path, method, body, contentType);
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
    if (result.rawJson !== undefined) {
      event.res.headers.set('content-type', 'application/json; charset=utf-8');
      return result.rawJson;
    }
    return result.status === 204 ? null : result.data;
  } catch (error) {
    // A late401 must not delete a newer login's cookie. Revoke only this request's generation.
    if (session && typeof error === 'object' && error && 'status' in error && error.status === 401)
      revokeSession(session.user.generation, session.user.expiresAt);
    throw error;
  }
});
