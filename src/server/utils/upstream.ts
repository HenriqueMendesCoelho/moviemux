import { createError, useRuntimeConfig } from 'nuxt/server';
import {
  invalidLegacyFilmLink,
  legacyFilmResolverPath,
  legacyFilmResolverResponse,
} from './legacy-film-resolver';
import {
  invalidVisibilitySettings,
  rankingVisibilityError,
  rankingVisibilityOperation,
  rankingVisibilityResponse,
} from './ranking-visibility-contract';
import {
  invalidRatingCopy,
  rankingRatingCopyError,
  rankingRatingCopyOperation,
  rankingRatingCopyResponse,
} from './ranking-rating-copy';
import {
  entryRemovalError,
  entryRemovalOperation,
  entryRemovalResponse,
  invalidEntryRemoval,
} from './ranking-entry-recovery';
import {
  recoveryDirectoryError,
  recoveryDirectoryOperation,
  recoveryDirectoryQuery,
  recoveryDirectoryResponse,
} from './ranking-recovery-directory';
import {
  memberRosterError,
  memberRosterOperation,
  memberRosterQuery,
  memberRosterResponse,
} from './ranking-member-roster';
import {
  catalogPickerOperation,
  invalidCatalogPicker,
  rankingCatalogPickerError,
  rankingCatalogPickerResponse,
} from './ranking-catalog-picker';
import {
  manualCatalogOperation,
  manualCatalogUpstreamError,
  manualCatalogUpstreamResponse,
} from './manual-catalog';
import {
  registrationError,
  registrationOperation,
  registrationResponse,
} from './registration-contract';
import { fixedUpstream } from './security';
import { collectionContractPath } from './collection-contract-path';
import {
  rankingTmdbError,
  rankingTmdbOperation,
  rankingTmdbResponse,
} from './ranking-tmdb-contract';

import {
  invalidRepeatedRoundRequest,
  repeatedRoundError,
  repeatedRoundOperation,
  repeatedRoundResponse,
} from './repeated-round-contract';

const uuid = '[a-zA-Z0-9_-]{1,128}';
const rankingUuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const rankingRoot = `/rankings/${rankingUuid}`;
const rankingEntry = `${rankingRoot}/entries/${rankingUuid}`;
const rankingSummaryPath = new RegExp(`^${rankingRoot}$`);
const rankingAccessPath = new RegExp(`^${rankingRoot}/access$`);
const rankingEntriesPath = new RegExp(`^${rankingRoot}/entries$`);
const rankingRoundsPath = new RegExp(`^${rankingEntry}/rounds$`);
const roundAggregatePath = new RegExp(
  `^${rankingEntry}/rounds/(${rankingUuid})/ratings/aggregate$`,
);
const rankingRoundDetailPath = new RegExp(`^${rankingEntry}/rounds/(${rankingUuid})$`);
const ownRatingPath = new RegExp(`^${rankingRoot}/rounds/${rankingUuid}/rating/me$`);
const aggregatePath = new RegExp(`^${rankingRoot}/entries/(${rankingUuid})/ratings/aggregate$`);
const issueInvitationPath = new RegExp(`^${rankingRoot}/invitations$`);
const revokeInvitationPath = new RegExp(`^${rankingRoot}/invitations/${rankingUuid}$`);
const incomingInvitationsPath = '/ranking-invitations/incoming';
const acceptInvitationPath = new RegExp(`^${rankingRoot}/invitations/${rankingUuid}/accept$`);
const joinRankingPath = new RegExp(`^${rankingRoot}/join$`);
export function isRankingJoin(path: string, method: string): boolean {
  return method === 'POST' && joinRankingPath.test(collectionContractPath(path));
}
const rules: Array<[RegExp, string[]]> = [
  [/^\/public\/user$/, ['POST']],
  [/^\/public\/user\/password\/reset$/, ['POST']],
  [/^\/public\/user\/password\/[a-zA-Z0-9]{200}\/reset$/, ['POST']],
  [/^\/public\/movie\/tmdb\/\d+\/info$/, ['GET']],
  [/^\/rankings$/, ['GET', 'POST']],
  [/^\/ranking-invitations\/incoming$/, ['GET']],
  [acceptInvitationPath, ['POST']],
  [joinRankingPath, ['POST']],
  [issueInvitationPath, ['POST']],
  [revokeInvitationPath, ['DELETE']],
  [/^\/rankings\/access$/, ['GET']],
  [rankingSummaryPath, ['GET']],
  [rankingAccessPath, ['GET']],
  [rankingEntriesPath, ['GET']],
  [rankingRoundsPath, ['GET']],
  [rankingRoundDetailPath, ['GET']],
  [roundAggregatePath, ['GET']],
  [ownRatingPath, ['GET', 'POST', 'PATCH']],
  [aggregatePath, ['GET']],
  [/^\/user$/, ['GET']],
  [/^\/user\/ranking-invitation-address$/, ['GET']],
  [/^\/user\/ranking-invitation-address\/rotate$/, ['POST']],
  [/^\/user\/(?:update|p\/update)$/, ['PATCH']],
  [/^\/user\/wishlist$/, ['GET', 'POST']],
  [new RegExp(`^/user/wishlist/${uuid}$`), ['GET', 'PATCH']],
  [new RegExp(`^/user/wishlist/${uuid}/movies-rated$`), ['GET']],
  [new RegExp(`^/user/wishlist/${uuid}/update$`), ['PUT']],
  [new RegExp(`^/user/wishlist/${uuid}/delete$`), ['DELETE']],
  [/^\/restricted\/user$/, ['GET']],
  [/^\/restricted\/user\/invite$/, ['GET', 'POST']],
  [new RegExp(`^/restricted/user/invite/${uuid}/delete$`), ['DELETE']],
  [/^\/restricted\/user\/[a-zA-Z0-9@._+%-]{1,254}$/, ['GET', 'DELETE']],
  [new RegExp(`^/restricted/user/${uuid}/(?:promote|demote|block)$`), ['PATCH']],
  [new RegExp(`^/restricted/discord/${uuid}$`), ['POST', 'PATCH']],
  [/^\/movie$/, ['GET', 'POST']],
  [/^\/movie\/(?:genres|genres-with-movies)$/, ['GET']],
  [/^\/movie\/note$/, ['POST']],
  [new RegExp(`^/movie/note/${uuid}$`), ['GET']],
  [new RegExp(`^/movie/note/${uuid}/update$`), ['PATCH']],
  [new RegExp(`^/movie/note/${uuid}/delete$`), ['DELETE']],
  [/^\/movie\/tmdb(?:\/(?:popular|now-playing|upcoming|top-rated|discover))?$/, ['GET']],
  [/^\/movie\/tmdb\/\d+\/(?:summary|recommendations|similar|watch-providers|credits)$/, ['GET']],
  [new RegExp(`^/movie/${uuid}$`), ['GET']],
  [new RegExp(`^/movie/${uuid}/update$`), ['PUT']],
  [new RegExp(`^/movie/${uuid}/delete$`), ['DELETE']],
  [/^\/statistic\/movies$/, ['GET']],
];
export function allowedApiPath(path: string, method: string): boolean {
  path = collectionContractPath(path);
  if (path.includes('..') || path.includes('\\') || /%(?:2f|5c|2e|25)/i.test(path)) return false;
  return (
    Boolean(registrationOperation(path, method)) ||
    Boolean(manualCatalogOperation(path, method)) ||
    legacyFilmResolverPath(path, method) ||
    Boolean(memberRosterOperation(path, method)) ||
    Boolean(entryRemovalOperation(path, method)) ||
    Boolean(recoveryDirectoryOperation(path, method)) ||
    Boolean(rankingRatingCopyOperation(path, method)) ||
    Boolean(rankingVisibilityOperation(path, method)) ||
    Boolean(repeatedRoundOperation(path, method)) ||
    Boolean(catalogPickerOperation(path, method)) ||
    Boolean(rankingTmdbOperation(path, method)) ||
    rules.some(([pattern, methods]) => pattern.test(path) && methods.includes(method))
  );
}
export function assertRankingReadIntent(path: string, method: string, headers: Headers): void {
  if (
    method === 'GET' &&
    rankingRoundDetailPath.test(collectionContractPath(path)) &&
    [headers.get('purpose'), headers.get('sec-purpose')].some(
      (value) => value && /\b(?:prefetch|prerender)\b/i.test(value),
    )
  )
    throw createError({ status: 400, message: 'Explicit round detail action required' });
}
export function assertRankingReadQuery(
  pathname: string,
  method: string,
  query: URLSearchParams,
  hasQueryDelimiter = false,
  rawQuery?: string,
): void {
  pathname = collectionContractPath(pathname);
  if (legacyFilmResolverPath(pathname, method)) {
    if (hasQueryDelimiter || query.size) invalidLegacyFilmLink();
    return;
  }
  const roster = memberRosterOperation(pathname, method);
  if (roster) {
    memberRosterQuery(
      roster,
      hasQueryDelimiter || query.size ? (rawQuery ?? query.toString()) : undefined,
    );
    return;
  }
  const recovery = recoveryDirectoryOperation(pathname, method);
  if (recovery) {
    recoveryDirectoryQuery(
      recovery,
      hasQueryDelimiter || query.size ? (rawQuery ?? query.toString()) : undefined,
    );
    return;
  }
  if (entryRemovalOperation(pathname, method)) {
    if (query.size || hasQueryDelimiter) invalidEntryRemoval();
    return;
  }
  const catalogPicker = catalogPickerOperation(pathname, method);
  if (catalogPicker) {
    if (query.size || hasQueryDelimiter) invalidCatalogPicker(catalogPicker);
    return;
  }
  if (rankingRatingCopyOperation(pathname, method)) {
    if (query.size || hasQueryDelimiter) invalidRatingCopy();
    return;
  }
  if (rankingVisibilityOperation(pathname, method)) {
    if (query.size || hasQueryDelimiter) invalidVisibilitySettings();
    return;
  }
  const repeated = repeatedRoundOperation(pathname, method);
  if (repeated) {
    if (query.size || hasQueryDelimiter) invalidRepeatedRoundRequest(repeated);
    return;
  }
  if (
    method === 'GET' &&
    hasQueryDelimiter &&
    (rankingRoundDetailPath.test(pathname) || roundAggregatePath.test(pathname))
  )
    throw createError({ status: 400, message: 'Invalid ranking query' });
  if (isRankingJoin(pathname, method)) {
    if (query.size || hasQueryDelimiter)
      throw createError({
        status: 400,
        message: 'Invalid ranking query',
        data: { code: 'ranking.invalid_join' },
      });
    return;
  }
  if (
    rankingTmdbOperation(pathname, method) ||
    issueInvitationPath.test(pathname) ||
    revokeInvitationPath.test(pathname) ||
    acceptInvitationPath.test(pathname) ||
    pathname === '/user/ranking-invitation-address' ||
    pathname === '/user/ranking-invitation-address/rotate' ||
    (method === 'POST' && pathname === '/rankings') ||
    ((method === 'POST' || method === 'PATCH') && ownRatingPath.test(pathname))
  ) {
    if (query.size) throw createError({ status: 400, message: 'Invalid ranking query' });
    return;
  }
  if (
    method !== 'GET' ||
    !(pathname.startsWith('/rankings') || pathname === incomingInvitationsPath)
  )
    return;
  const rounds = rankingRoundsPath.test(pathname);
  const paged =
    rounds ||
    pathname === '/rankings' ||
    pathname === '/rankings/access' ||
    pathname === incomingInvitationsPath ||
    rankingEntriesPath.test(pathname);
  const seen = new Set<string>();
  for (const [name, value] of query) {
    const valid =
      paged &&
      ((name === 'limit' && /^([1-9][0-9]?|100)$/.test(value)) ||
        (!rounds && name === 'after' && new RegExp(`^${rankingUuid}$`).test(value)) ||
        (rounds &&
          name === 'afterNumber' &&
          /^[1-9][0-9]{0,18}$/.test(value) &&
          (value.length < 19 || value <= '9223372036854775807')));
    if (!valid || seen.has(name))
      throw createError({
        status: 400,
        message: 'Invalid ranking query',
        ...(paged ? { data: { code: 'ranking.invalid_page' } } : {}),
      });
    seen.add(name);
  }
}
// Match the verified endpoint, method, status and code, never an arbitrary upstream error.
function rankingErrorCode(
  path: string,
  method: string,
  status: number,
  text: string,
): string | undefined {
  const pathname = path.split('?')[0] || '';
  let expected: string | undefined;
  let alternative: string | undefined;
  const paged =
    pathname === '/rankings' ||
    pathname === '/rankings/access' ||
    pathname === incomingInvitationsPath ||
    rankingEntriesPath.test(pathname) ||
    rankingRoundsPath.test(pathname);
  const ownRating = ownRatingPath.test(pathname);
  const aggregate = aggregatePath.test(pathname);
  if (
    method === 'GET' &&
    (paged ||
      rankingSummaryPath.test(pathname) ||
      rankingRoundDetailPath.test(pathname) ||
      roundAggregatePath.test(pathname) ||
      rankingAccessPath.test(pathname) ||
      ownRating ||
      aggregate)
  ) {
    if (status === 400 && paged) expected = 'ranking.invalid_page';
    if (status === 400 && ownRating) expected = 'ranking.invalid_rating';
    if (status === 400 && aggregate) expected = 'ranking.invalid_rating_aggregate';
    if (status === 404) expected = 'ranking.not_found';
  } else if ((method === 'POST' || method === 'PATCH') && ownRating) {
    if (status === 400) expected = 'ranking.invalid_rating';
    if (status === 404) expected = 'ranking.not_found';
    if (status === 409) {
      expected = 'ranking.archived_read_only';
      if (method === 'POST') alternative = 'ranking.rating_exists';
    }
  } else if (method === 'POST' && pathname === '/rankings') {
    if (status === 400) expected = 'ranking.invalid_creation';
    if (status === 409) expected = 'ranking.creation_limit_reached';
    if (status === 503) expected = 'ranking.creation_unavailable';
  }
  if (
    status === 503 &&
    ((method === 'GET' && pathname === '/user/ranking-invitation-address') ||
      (method === 'POST' && pathname === '/user/ranking-invitation-address/rotate'))
  )
    expected = 'ranking.invitation_address_unavailable';
  if (isRankingJoin(pathname, method)) {
    if (status === 400) expected = 'ranking.invalid_join';
    if (status === 404) expected = 'ranking.not_found';
  }
  if (method === 'POST' && acceptInvitationPath.test(pathname) && status === 404)
    expected = 'ranking.invitation_not_found';
  if (method === 'POST' && issueInvitationPath.test(pathname)) {
    if (status === 400) expected = 'ranking.invalid_invitation';
    if (status === 404) expected = 'ranking.invitation_not_found';
    if (status === 409) expected = 'ranking.invitation_exists';
    if (status === 503) expected = 'ranking.invitation_address_unavailable';
  }
  if (method === 'DELETE' && revokeInvitationPath.test(pathname) && status === 404)
    expected = 'ranking.invitation_not_found';
  if (!expected) return undefined;
  try {
    const body: unknown = JSON.parse(text);
    if (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'code' in body &&
      (body.code === expected || (alternative !== undefined && body.code === alternative))
    )
      return body.code as string;
  } catch {
    // Malformed upstream responses use the same generic, sanitized error as unknown codes.
  }
  return undefined;
}
// Aggregate has only primitive fields. Check the wire tokens directly to preserve integer precision,
// and reject extra/duplicate fields so the raw response cannot expose a broader upstream projection.
const aggregateMember =
  /^[ \t\r\n]*"(entry_id|total|votes|partial)"[ \t\r\n]*:[ \t\r\n]*("[a-fA-F0-9-]+"|0|-?[1-9][0-9]*|true|false)[ \t\r\n]*$/;
const aggregateDocument = /^[ \t\r\n]*\{([^{}]*)\}[ \t\r\n]*$/;
function validAggregate(text: string, entryId: string): boolean {
  const members = aggregateDocument.exec(text)?.[1]?.split(',');
  if (members?.length !== 4) return false;
  const values = new Map<string, string>();
  for (const member of members) {
    const match = aggregateMember.exec(member);
    if (!match || values.has(match[1]!)) return false;
    values.set(match[1]!, match[2]!);
  }
  return (
    values.get('entry_id')?.toLowerCase() === JSON.stringify(entryId.toLowerCase()) &&
    /^(0|-?[1-9][0-9]*)$/.test(values.get('total') || '') &&
    /^(0|[1-9][0-9]*)$/.test(values.get('votes') || '') &&
    ['true', 'false'].includes(values.get('partial') || '')
  );
}
const roundAggregateMember =
  /^[ \t\r\n]*"(round_id|revealed|total|votes)"[ \t\r\n]*:[ \t\r\n]*("[a-fA-F0-9-]+"|true|false|null|0|-?[1-9][0-9]*)[ \t\r\n]*$/;
function validRoundAggregate(text: string, roundId: string): boolean {
  const members = aggregateDocument.exec(text)?.[1]?.split(',');
  if (members?.length !== 4) return false;
  const fields = new Map<string, string>();
  for (const member of members) {
    const match = roundAggregateMember.exec(member);
    if (!match || fields.has(match[1]!)) return false;
    fields.set(match[1]!, match[2]!);
  }
  if (fields.get('round_id')?.toLowerCase() !== JSON.stringify(roundId.toLowerCase())) return false;
  if (fields.get('revealed') === 'false' || fields.get('revealed') === 'null')
    return fields.get('total') === 'null' && fields.get('votes') === 'null';
  return (
    fields.get('revealed') === 'true' &&
    /^(0|-?[1-9][0-9]*)$/.test(fields.get('total') || '') &&
    /^(0|[1-9][0-9]*)$/.test(fields.get('votes') || '') &&
    (fields.get('votes') !== '0' || fields.get('total') === '0')
  );
}
export async function upstreamRequest(
  path: string,
  options: { method: string; body?: string; contentType?: string; token?: string },
): Promise<{ status: number; data: unknown; rawJson?: string }> {
  const manualCatalog = manualCatalogOperation(path, options.method);
  const registration = registrationOperation(path.split('?', 1)[0]!, options.method);
  const legacyLink = legacyFilmResolverPath(path, options.method);
  const base = fixedUpstream(String(useRuntimeConfig().apiUpstream || ''));
  const target = new URL(`${base.pathname.replace(/\/$/, '')}${path}`, base.origin);
  path = collectionContractPath(path);
  if (target.origin !== base.origin)
    throw createError({ status: 400, message: 'Invalid API path' });
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.contentType) headers['content-type'] = options.contentType;
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let response: Response;
  try {
    response = await fetch(target, {
      ...(legacyLink ? { cache: 'no-store' as const, signal: AbortSignal.timeout(5000) } : {}),
      method: options.method,
      headers,
      body: options.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw createError({ status: 502, message: 'API unavailable' });
  }
  if (response.status >= 300 && response.status < 400)
    throw createError({ status: 502, message: 'Unexpected API redirect' });
  const reader = response.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (
        size >
        (legacyLink
          ? 256
          : registration === 'admin-list'
            ? 65536
            : registration && registration !== 'signup'
              ? 1024
              : 4 * 1024 * 1024)
      ) {
        await reader.cancel();
        throw createError({ status: 502, message: 'API response too large' });
      }
      chunks.push(value);
    }
  }
  let text: string;
  try {
    const bytes = Buffer.concat(chunks);
    text =
      registration && registration !== 'signup'
        ? new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        : bytes.toString('utf8');
  } catch {
    throw createError({ status: 502, message: 'Invalid API response' });
  }
  if (legacyLink) return legacyFilmResolverResponse(response.status, text);
  const repeated = repeatedRoundOperation(path, options.method);
  const visibility = rankingVisibilityOperation(path, options.method);
  const copy = rankingRatingCopyOperation(path, options.method);
  const catalogPicker = catalogPickerOperation(path, options.method);
  const queryAt = path.indexOf('?');
  const pathname = queryAt < 0 ? path : path.slice(0, queryAt);
  const roster = memberRosterOperation(pathname, options.method);
  const recovery = recoveryDirectoryOperation(pathname, options.method);
  const removal = entryRemovalOperation(path, options.method);
  if (!response.ok) {
    // Only a verified code may cross the boundary, never upstream messages or other fields.
    const operation = rankingTmdbOperation(path, options.method);
    const code = registration
      ? registrationError(registration, response.status, text)
      : manualCatalog
        ? manualCatalogUpstreamError(manualCatalog, response.status, text)
        : catalogPicker
          ? rankingCatalogPickerError(catalogPicker, response.status, text)
          : roster
            ? memberRosterError(roster, response.status, text)
            : recovery
              ? recoveryDirectoryError(recovery, response.status, text)
              : removal
                ? entryRemovalError(removal, response.status, text)
                : copy
                  ? rankingRatingCopyError(copy, response.status, text)
                  : visibility
                    ? rankingVisibilityError(response.status, text)
                    : repeated
                      ? repeatedRoundError(repeated, response.status, text)
                      : operation
                        ? rankingTmdbError(operation, response.status, text)
                        : rankingErrorCode(path, options.method, response.status, text);
    throw createError({
      status:
        code || [400, 401, 403, 404, 409, 422, 429].includes(response.status)
          ? response.status
          : 502,
      ...(code ? { data: { code } } : {}),
      message:
        response.status === 401
          ? 'Session expired'
          : response.status === 403
            ? 'Access denied'
            : 'API request failed',
    });
  }
  if (registration && registration !== 'signup')
    return registrationResponse(registration, response.status, text, options.body, path);
  if (manualCatalog) return manualCatalogUpstreamResponse(manualCatalog, response.status, text);
  if (roster)
    return memberRosterResponse(
      roster,
      response.status,
      text,
      queryAt < 0 ? undefined : path.slice(queryAt + 1),
    );
  if (recovery)
    return recoveryDirectoryResponse(
      recovery,
      response.status,
      text,
      queryAt < 0 ? undefined : path.slice(queryAt + 1),
      options.body,
    );
  if (removal) return entryRemovalResponse(removal, response.status, text, options.body);
  if (catalogPicker)
    return rankingCatalogPickerResponse(catalogPicker, response.status, text, options.body);
  if (copy) return rankingRatingCopyResponse(copy, response.status, text);
  if (visibility) return rankingVisibilityResponse(visibility, response.status, text, options.body);
  if (repeated) return repeatedRoundResponse(repeated, response.status, text, options.body);
  if (isRankingJoin(path, options.method)) {
    if (response.status !== 204 || text !== '')
      throw createError({ status: 502, message: 'Unconfirmed ranking join response' });
    return { status: 204, data: null };
  }
  const aggregateEntryId =
    options.method === 'GET' ? aggregatePath.exec(path.split('?')[0] || '')?.[1] : undefined;
  if (aggregateEntryId) {
    if (response.status !== 200 || !validAggregate(text, aggregateEntryId))
      throw createError({ status: 502, message: 'Invalid API response' });
    return { status: response.status, data: null, rawJson: text };
  }
  const aggregateRoundId =
    options.method === 'GET' ? roundAggregatePath.exec(path.split('?')[0] || '')?.[1] : undefined;
  if (aggregateRoundId) {
    if (response.status !== 200 || !validRoundAggregate(text, aggregateRoundId))
      throw createError({ status: 502, message: 'Invalid API response' });
    return { status: 200, data: null, rawJson: text };
  }
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw createError({ status: 502, message: 'Invalid API response' });
  }
  const tmdb = rankingTmdbOperation(path, options.method);
  if (tmdb)
    return {
      status: response.status,
      data: rankingTmdbResponse(tmdb, response.status, data, options.body),
    };
  const roundDetailId =
    options.method === 'GET' ? rankingRoundDetailPath.exec(path)?.[1] : undefined;
  if (roundDetailId) {
    const v = data as Record<string, unknown> | null;
    if (
      response.status !== 200 ||
      !v ||
      typeof v.round_id !== 'string' ||
      v.round_id.toLowerCase() !== roundDetailId.toLowerCase() ||
      typeof v.round_number !== 'number' ||
      !Number.isSafeInteger(v.round_number) ||
      v.round_number < 1 ||
      !(v.revealed === null || typeof v.revealed === 'boolean')
    )
      throw createError({ status: 502, message: 'Invalid API response' });
    return {
      status: 200,
      data: { round_id: v.round_id, round_number: v.round_number, revealed: v.revealed },
    };
  }
  if (options.method === 'GET' && rankingSummaryPath.test(path)) {
    const v = data as Record<string, unknown> | null;
    if (
      response.status !== 200 ||
      !v ||
      typeof v.ranking_id !== 'string' ||
      v.ranking_id.toLowerCase() !== path.slice('/rankings/'.length).toLowerCase() ||
      !(v.name === null || typeof v.name === 'string') ||
      !(v.visibility === 'PRIVATE' || v.visibility === 'PUBLIC') ||
      !(v.admission === 'OPEN' || v.admission === 'APPROVAL' || v.admission === 'INVITATION') ||
      !Array.isArray(v.capabilities) ||
      !v.capabilities.every((grant) => typeof grant === 'string')
    )
      throw createError({ status: 502, message: 'Invalid API response' });
    return {
      status: 200,
      data: {
        ranking_id: v.ranking_id,
        name: v.name,
        visibility: v.visibility,
        admission: v.admission,
        capabilities: v.capabilities,
        ...(typeof v.can_share_open_link === 'boolean'
          ? { can_share_open_link: v.can_share_open_link }
          : {}),
      },
    };
  }
  if (options.method === 'GET' && path.split('?')[0] === incomingInvitationsPath) {
    const page = data as { items?: unknown; next_cursor?: unknown } | null;
    const validId = (id: unknown) =>
      typeof id === 'string' && new RegExp(`^${rankingUuid}$`).test(id);
    if (
      response.status !== 200 ||
      !page ||
      !Array.isArray(page.items) ||
      !(page.next_cursor === null || validId(page.next_cursor))
    )
      throw createError({ status: 502, message: 'Invalid API response' });
    const items = page.items.map((value: unknown) => {
      const v = value as Record<string, unknown> | null;
      if (
        !v ||
        !validId(v.invite_id) ||
        !validId(v.ranking_id) ||
        !(v.ranking_name === null || typeof v.ranking_name === 'string') ||
        typeof v.expires_at !== 'string' ||
        !Number.isFinite(Date.parse(v.expires_at))
      )
        throw createError({ status: 502, message: 'Invalid API response' });
      return {
        invite_id: v.invite_id,
        ranking_id: v.ranking_id,
        ranking_name: v.ranking_name,
        expires_at: v.expires_at,
      };
    });
    return { status: 200, data: { items, next_cursor: page.next_cursor } };
  }
  if (options.method === 'POST' && issueInvitationPath.test(path)) {
    const v = data as Record<string, unknown> | null;
    if (
      response.status !== 201 ||
      !v ||
      typeof v.invite_id !== 'string' ||
      !new RegExp(`^${rankingUuid}$`).test(v.invite_id) ||
      typeof v.expires_at !== 'string' ||
      !Number.isFinite(Date.parse(v.expires_at))
    )
      throw createError({ status: 502, message: 'Invalid API response' });
    return { status: 201, data: { invite_id: v.invite_id, expires_at: v.expires_at } };
  }
  const addressResponse =
    (options.method === 'GET' && path === '/user/ranking-invitation-address') ||
    (options.method === 'POST' && path === '/user/ranking-invitation-address/rotate');
  if (addressResponse) {
    const code =
      data && typeof data === 'object' && 'recipient_code' in data
        ? data.recipient_code
        : undefined;
    if (
      response.status !== 200 ||
      !(
        (typeof code === 'string' && /^[A-Za-z0-9_-]{21}[AQgw]$/.test(code)) ||
        (code === null && options.method === 'GET')
      )
    )
      throw createError({ status: 502, message: 'Invalid API response' });
    return { status: 200, data: { recipient_code: code } };
  }
  return { status: response.status, data };
}
