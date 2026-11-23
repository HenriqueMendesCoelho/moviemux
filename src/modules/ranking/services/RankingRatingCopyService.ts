import api from '~/core/http';
import {
  canonicalCopyId,
  isRatingCopyToken,
  parseRatingCopyPreview,
  parseRatingCopyReceipt,
  ratingCopyErrorCode,
  type RatingCopyOperation,
  type RatingCopyScope,
} from '../utils/ratingCopyContract';

export type {
  RatingCopyPreview,
  RatingCopyReceipt,
  RatingCopyScope,
} from '../utils/ratingCopyContract';
export class RankingRatingCopyError extends Error {
  constructor(
    readonly status?: number,
    readonly code?: ReturnType<typeof ratingCopyErrorCode>,
  ) {
    super('Rating copy unavailable or unconfirmed');
    this.name = 'RankingRatingCopyError';
  }
}
function invalid(): never {
  throw new RankingRatingCopyError();
}
function scope(value: RatingCopyScope) {
  const ranking_id = canonicalCopyId(value.rankingId);
  const entry_id = canonicalCopyId(value.entryId);
  const round_id = canonicalCopyId(value.roundId);
  if (!ranking_id || !entry_id || !round_id) return invalid();
  return { ranking_id, entry_id, round_id };
}
function path(value: ReturnType<typeof scope>, operation: RatingCopyOperation) {
  return `/movies/collections/${value.ranking_id}/entries/${value.entry_id}/rounds/${value.round_id}/rating/me/copy-${operation}`;
}
function clean(operation: RatingCopyOperation, error: unknown) {
  const response = (
    error as { response?: { status?: unknown; data?: { data?: { code?: unknown } } } } | undefined
  )?.response;
  const status = response?.status;
  if (typeof status !== 'number') return new RankingRatingCopyError();
  // Never propagate raw Axios errors: configuration may hold the token/body.
  return new RankingRatingCopyError(
    status,
    ratingCopyErrorCode(operation, status, response?.data?.data?.code),
  );
}
export default {
  async preview(destination: RatingCopyScope, source: RatingCopyScope, signal?: AbortSignal) {
    if (import.meta.server) return invalid();
    const target = scope(destination);
    const origin = scope(source);
    if (target.ranking_id === origin.ranking_id)
      throw new RankingRatingCopyError(404, 'ranking.not_found');
    const response = await api
      .post(path(target, 'preview'), { source: origin }, { signal })
      .catch((error: unknown) => {
        throw clean('preview', error);
      });
    const preview = parseRatingCopyPreview(response.data);
    if (response.status !== 200 || !preview) return invalid();
    return preview;
  },
  async apply(destination: RatingCopyScope, previewToken: string) {
    if (import.meta.server || !isRatingCopyToken(previewToken)) return invalid();
    const target = scope(destination);
    const response = await api
      .post(path(target, 'apply'), { preview_token: previewToken })
      .catch((error: unknown) => {
        throw clean('apply', error);
      });
    const receipt = parseRatingCopyReceipt(response.data, target.round_id);
    if (response.status !== 201 || !receipt) return invalid();
    return receipt;
  },
};
