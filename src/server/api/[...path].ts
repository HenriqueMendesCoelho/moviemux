import { defineEventHandler, createError, setResponseStatus } from 'nuxt/server';
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
  const session = isPublic ? undefined : await readActiveSession(event);
  assertRankingReadQuery(path, method, event.url.searchParams, event.url.href.includes('?'));
  assertRankingReadIntent(path, method, event.req.headers);
  const repeated = repeatedRoundOperation(collectionContractPath(path), method);
  if (repeated)
    ensureRepeatedRoundReadBodyless(
      repeated,
      event.req.headers.get('content-length'),
      event.req.headers.get('transfer-encoding'),
    );
  const contentType =
    repeated === 'read-settings' || isRankingJoin(path, method)
      ? undefined
      : event.req.headers.get('content-type')?.split(';')[0];
  if (
    !['GET', 'HEAD'].includes(method) &&
    contentType &&
    !['application/json', 'application/x-www-form-urlencoded'].includes(contentType)
  )
    throw createError({ status: 415, message: 'Unsupported request type' });
  let body: string | undefined;
  if (repeated && repeated !== 'read-settings') {
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
