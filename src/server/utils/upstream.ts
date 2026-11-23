import { createError, useRuntimeConfig } from 'nuxt/server';
import { fixedUpstream } from './security';

const uuid = '[a-zA-Z0-9_-]{1,128}';
const rankingUuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const rankingRoot = `/rankings/${rankingUuid}`;
const rankingEntry = `${rankingRoot}/entries/${rankingUuid}`;
const rankingSummaryPath = new RegExp(`^${rankingRoot}$`);
const rankingAccessPath = new RegExp(`^${rankingRoot}/access$`);
const rankingEntriesPath = new RegExp(`^${rankingRoot}/entries$`);
const rankingRoundsPath = new RegExp(`^${rankingEntry}/rounds$`);
const ownRatingPath = new RegExp(`^${rankingRoot}/rounds/${rankingUuid}/rating/me$`);
const aggregatePath = new RegExp(`^${rankingRoot}/entries/(${rankingUuid})/ratings/aggregate$`);
const rules: Array<[RegExp, string[]]> = [
  [/^\/public\/user$/, ['POST']],
  [/^\/public\/user\/password\/reset$/, ['POST']],
  [/^\/public\/user\/password\/[a-zA-Z0-9]{200}\/reset$/, ['POST']],
  [/^\/public\/movie\/tmdb\/\d+\/info$/, ['GET']],
  [/^\/rankings$/, ['GET', 'POST']],
  [/^\/rankings\/access$/, ['GET']],
  [rankingSummaryPath, ['GET']],
  [rankingAccessPath, ['GET']],
  [rankingEntriesPath, ['GET']],
  [rankingRoundsPath, ['GET']],
  [ownRatingPath, ['GET', 'POST', 'PATCH']],
  [aggregatePath, ['GET']],
  [/^\/user$/, ['GET']],
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
  if (path.includes('..') || path.includes('\\') || /%(?:2f|5c|2e|25)/i.test(path)) return false;
  return rules.some(([pattern, methods]) => pattern.test(path) && methods.includes(method));
}
export function assertRankingReadQuery(
  pathname: string,
  method: string,
  query: URLSearchParams,
): void {
  if ((method === 'POST' || method === 'PATCH') && ownRatingPath.test(pathname)) {
    if (query.size) throw createError({ status: 400, message: 'Invalid ranking query' });
    return;
  }
  if (method !== 'GET' || !pathname.startsWith('/rankings')) return;
  const rounds = rankingRoundsPath.test(pathname);
  const paged =
    rounds ||
    pathname === '/rankings' ||
    pathname === '/rankings/access' ||
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
    rankingEntriesPath.test(pathname) ||
    rankingRoundsPath.test(pathname);
  const ownRating = ownRatingPath.test(pathname);
  const aggregate = aggregatePath.test(pathname);
  if (
    method === 'GET' &&
    (paged ||
      rankingSummaryPath.test(pathname) ||
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
export async function upstreamRequest(
  path: string,
  options: { method: string; body?: string; contentType?: string; token?: string },
) {
  const base = fixedUpstream(String(useRuntimeConfig().apiUpstream || ''));
  const target = new URL(`${base.pathname.replace(/\/$/, '')}${path}`, base.origin);
  if (target.origin !== base.origin)
    throw createError({ status: 400, message: 'Invalid API path' });
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.contentType) headers['content-type'] = options.contentType;
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let response: Response;
  try {
    response = await fetch(target, {
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
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        throw createError({ status: 502, message: 'API response too large' });
      }
      chunks.push(value);
    }
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!response.ok) {
    // Only a verified code may cross the boundary, never upstream messages or other fields.
    const code = rankingErrorCode(path, options.method, response.status, text);
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
  const aggregateEntryId =
    options.method === 'GET' ? aggregatePath.exec(path.split('?')[0] || '')?.[1] : undefined;
  if (aggregateEntryId) {
    if (response.status !== 200 || !validAggregate(text, aggregateEntryId))
      throw createError({ status: 502, message: 'Invalid API response' });
    return { status: response.status, data: null, rawJson: text };
  }
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw createError({ status: 502, message: 'Invalid API response' });
  }
  return { status: response.status, data };
}
