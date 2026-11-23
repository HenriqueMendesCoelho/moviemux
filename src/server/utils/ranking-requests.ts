import { createError } from 'nuxt/server';
import { collectionContractPath } from './collection-contract-path';
import { rankingTmdbBody, rankingTmdbOperation } from './ranking-tmdb-contract';
import { entryRemovalBody, entryRemovalOperation } from './ranking-entry-recovery';
import { recoveryDirectoryBody, recoveryDirectoryOperation } from './ranking-recovery-directory';
import { rankingRatingCopyBody, rankingRatingCopyOperation } from './ranking-rating-copy';
import { rankingVisibilityBody, rankingVisibilityOperation } from './ranking-visibility-contract';
import { repeatedRoundBody, repeatedRoundOperation } from './repeated-round-contract';
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const openJoin = new RegExp(`^/rankings/${uuid}/join$`);
const ownRating = new RegExp(`^/rankings/${uuid}/rounds/${uuid}/rating/me$`);
/** A browser can request context, never supply an actor, owner or additional grants. */
export function rankingRequestBody(
  path: string,
  method: string,
  body: string | undefined,
  contentType: string | undefined,
): string | undefined {
  path = collectionContractPath(path);
  const removal = entryRemovalOperation(path, method);
  if (removal) return entryRemovalBody(removal, body, contentType);
  const recovery = recoveryDirectoryOperation(path, method);
  if (recovery) return recoveryDirectoryBody(recovery, body, contentType);
  const copy = rankingRatingCopyOperation(path, method);
  if (copy) return rankingRatingCopyBody(copy, body, contentType);
  const visibility = rankingVisibilityOperation(path, method);
  if (visibility) return rankingVisibilityBody(visibility, body, contentType);
  const repeated = repeatedRoundOperation(path, method);
  if (repeated) return repeatedRoundBody(repeated, body, contentType);
  if (method === 'POST' && openJoin.test(path)) {
    if (body !== undefined && body !== '')
      throw createError({
        status: 400,
        message: 'Bodyless request required',
        data: { code: 'ranking.invalid_join' },
      });
    return undefined;
  }
  const tmdb = rankingTmdbOperation(path, method);
  if (tmdb) return rankingTmdbBody(tmdb, body, contentType);
  if (
    (method === 'DELETE' && new RegExp(`^/rankings/${uuid}/invitations/${uuid}$`).test(path)) ||
    (method === 'POST' &&
      (path === '/user/ranking-invitation-address/rotate' ||
        new RegExp(`^/rankings/${uuid}/invitations/${uuid}/accept$`).test(path)))
  ) {
    if (body !== undefined && body !== '')
      throw createError({ status: 400, message: 'Bodyless request required' });
    return undefined;
  }
  const invite = method === 'POST' && new RegExp(`^/rankings/${uuid}/invitations$`).test(path);
  const create = path === '/rankings' && method === 'POST';
  const rate = ownRating.test(path) && (method === 'POST' || method === 'PATCH');
  if (!create && !rate && !invite) return body;
  const invalid = () =>
    createError({
      status: 400,
      message: 'Invalid ranking request',
      data: {
        code: create
          ? 'ranking.invalid_creation'
          : invite
            ? 'ranking.invalid_invitation'
            : 'ranking.invalid_rating',
      },
    });
  if (contentType !== 'application/json')
    throw createError({ status: 415, message: 'JSON request required' });
  let value: unknown;
  try {
    value = JSON.parse(body || '');
  } catch {
    throw invalid();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const v = value as Record<string, unknown>,
    keys = Object.keys(v);
  if (invite) {
    if (
      keys.length !== 1 ||
      keys[0] !== 'recipient_code' ||
      typeof v.recipient_code !== 'string' ||
      !/^[A-Za-z0-9_-]{21}[AQgw]$/.test(v.recipient_code)
    )
      throw invalid();
    return JSON.stringify({ recipient_code: v.recipient_code });
  }
  if (rate) {
    if (
      keys.length !== 1 ||
      keys[0] !== 'score' ||
      typeof v.score !== 'number' ||
      !Number.isInteger(v.score) ||
      v.score < 0 ||
      v.score > 10
    )
      throw invalid();
    return JSON.stringify({ score: v.score });
  }
  if (
    keys.length !== 3 ||
    !keys.every((key) => ['name', 'visibility', 'admission'].includes(key)) ||
    typeof v.name !== 'string' ||
    typeof v.visibility !== 'string' ||
    !['PUBLIC', 'PRIVATE'].includes(v.visibility) ||
    typeof v.admission !== 'string' ||
    !['OPEN', 'APPROVAL', 'INVITATION'].includes(v.admission)
  )
    throw invalid();
  const name = v.name.trim(),
    length = Array.from(name).length;
  if (!length || length > 120) throw invalid();
  return JSON.stringify({ name, visibility: v.visibility, admission: v.admission });
}
