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
import {
  invalidRatingCopy,
  rankingRatingCopyOperation,
  ratingCopyBodyLimit,
} from '../utils/ranking-rating-copy';
import {
  ENTRY_REMOVAL_BODY_LIMIT,
  entryRemovalOperation,
  invalidEntryRemoval,
} from '../utils/ranking-entry-recovery';
import {
  recoveryDirectoryOperation,
  RESTORE_CURRENT_BODY_LIMIT,
} from '../utils/ranking-recovery-directory';
import {
  invalidMemberRoster,
  memberRosterOperation,
  MEMBER_ROSTER_BODY_LIMIT,
} from '../utils/ranking-member-roster';
import {
  CATALOG_PICKER_BODY_LIMIT,
  catalogPickerOperation,
  invalidCatalogPicker,
  malformedCatalogPickerOperation,
} from '../utils/ranking-catalog-picker';
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
  const logical = collectionContractPath(path);
  const catalogPicker = catalogPickerOperation(logical, method);
  // Nitro's portable event also proxies its underlying H3 node context.
  const native = (event as typeof event & Partial<Pick<H3Event, 'node'>>).node;
  const rawUrl = native?.req.originalUrl ?? native?.req.url;
  if (!allowedApiPath(path, method)) {
    // Exact recognized command shape only; malformed IDs are rejected locally
    // after authentication and never widen the upstream allowlist.
    const malformed = malformedCatalogPickerOperation(logical, method);
    if (malformed && (rawUrl === undefined || rawUrl.split('?', 1)[0] === `/api${path}`)) {
      await readActiveSession(event);
      invalidCatalogPicker(malformed);
    }
    throw createError({ status: 404, message: 'API route not available' });
  }
  const isPublic = path.startsWith('/public/');
  const repeated = repeatedRoundOperation(logical, method);
  const visibility = rankingVisibilityOperation(logical, method);
  const copy = rankingRatingCopyOperation(logical, method);
  const removal = entryRemovalOperation(logical, method);
  const recovery = recoveryDirectoryOperation(logical, method);
  const roster = memberRosterOperation(logical, method);
  const recoveryRead = removal?.kind === 'preview' || recovery?.kind === 'list';
  if (
    (visibility || copy || removal || recovery || roster || catalogPicker) &&
    rawUrl !== undefined &&
    rawUrl.split('?', 1)[0] !== `/api${path}`
  )
    throw createError({ status: 404, message: 'API route not available' });
  const session = isPublic ? undefined : await readActiveSession(event);
  const querySource =
    visibility || copy || removal || recovery || roster || catalogPicker
      ? (rawUrl ?? event.url.href)
      : event.url.href;
  const queryAt = querySource.indexOf('?');
  const rawQuery = queryAt >= 0 ? querySource.slice(queryAt + 1) : undefined;
  assertRankingReadQuery(path, method, event.url.searchParams, queryAt >= 0, rawQuery);
  assertRankingReadIntent(path, method, event.req.headers);
  if (
    roster === 'list' &&
    (event.req.headers.has('transfer-encoding') ||
      (event.req.headers.has('content-length') &&
        event.req.headers.get('content-length') !== '0') ||
      event.req.body != null)
  )
    invalidMemberRoster(roster);
  if (
    recoveryRead &&
    (event.req.headers.has('transfer-encoding') ||
      (event.req.headers.has('content-length') &&
        event.req.headers.get('content-length') !== '0') ||
      event.req.body != null)
  )
    invalidEntryRemoval();
  if (
    visibility === 'read' &&
    (event.req.headers.has('transfer-encoding') ||
      (event.req.headers.has('content-length') &&
        event.req.headers.get('content-length') !== '0') ||
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
    repeated === 'read-settings' ||
    visibility === 'read' ||
    recoveryRead ||
    roster === 'list' ||
    isRankingJoin(path, method)
      ? undefined
      : event.req.headers.get('content-type')?.split(';')[0];
  if (
    !visibility &&
    !copy &&
    !removal &&
    !recovery &&
    !roster &&
    !catalogPicker &&
    !['GET', 'HEAD'].includes(method) &&
    contentType &&
    !['application/json', 'application/x-www-form-urlencoded'].includes(contentType)
  )
    throw createError({ status: 415, message: 'Unsupported request type' });
  let body: string | undefined;
  if (catalogPicker) {
    try {
      body = await boundedBody(event, CATALOG_PICKER_BODY_LIMIT, true);
    } catch {
      invalidCatalogPicker(catalogPicker);
    }
  } else if (roster === 'replace') {
    try {
      body = await boundedBody(event, MEMBER_ROSTER_BODY_LIMIT, true);
    } catch {
      invalidMemberRoster(roster);
    }
  } else if (removal?.kind === 'remove' || recovery?.kind === 'restore') {
    try {
      body = await boundedBody(
        event,
        removal ? ENTRY_REMOVAL_BODY_LIMIT : RESTORE_CURRENT_BODY_LIMIT,
        true,
      );
    } catch {
      invalidEntryRemoval();
    }
  } else if (copy) {
    try {
      body = await boundedBody(event, ratingCopyBodyLimit(copy), true);
    } catch {
      invalidRatingCopy();
    }
  } else if (visibility === 'write') {
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
