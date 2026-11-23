export interface RatingCopyScope {
  rankingId: string;
  entryId: string;
  roundId: string;
}
export type RatingCopyPreview =
  | { status: 'READY'; source_score: number; preview_token: string; expires_at: string }
  | {
      status: 'SOURCE_INELIGIBLE' | 'DESTINATION_EXISTS';
      source_score: null;
      preview_token: null;
      expires_at: null;
    };
export interface RatingCopyReceipt {
  round_id: string;
  score: number;
}
export type RatingCopyOperation = 'preview' | 'apply';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function canonicalCopyId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length === 36 && uuid.test(value)
    ? value.toLowerCase()
    : undefined;
}
export function isRatingCopyToken(value: unknown): value is string {
  // 198 bytes, fixed 264-character unpadded Base64URL. The server opens it;
  // the browser and BFF never decode the opaque body.
  return typeof value === 'string' && value.length === 264 && /^[A-Za-z0-9_-]{264}$/.test(value);
}
function score(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}
function utcInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.\d{1,9})?Z$/.exec(value);
  if (!m?.[1] || m[0].length !== value.length) return false;
  const whole = new Date(m[1] + 'Z');
  return Number.isFinite(whole.getTime()) && whole.toISOString().slice(0, 19) === m[1];
}
export function exactRecord(
  value: unknown,
  ...keys: string[]
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}
export function parseRatingCopyPreview(value: unknown): RatingCopyPreview | undefined {
  const v = exactRecord(value, 'status', 'source_score', 'preview_token', 'expires_at');
  if (!v) return undefined;
  const { status, source_score, preview_token, expires_at } = v;
  if (
    status === 'READY' &&
    score(source_score) &&
    isRatingCopyToken(preview_token) &&
    utcInstant(expires_at)
  )
    return { status, source_score, preview_token, expires_at };
  if (
    (status === 'SOURCE_INELIGIBLE' || status === 'DESTINATION_EXISTS') &&
    source_score === null &&
    preview_token === null &&
    expires_at === null
  )
    return { status, source_score, preview_token, expires_at };
  return undefined;
}
export function parseRatingCopyReceipt(
  value: unknown,
  round: string,
): RatingCopyReceipt | undefined {
  const v = exactRecord(value, 'round_id', 'score');
  if (!v || v.round_id !== round || canonicalCopyId(round) !== round || !score(v.score))
    return undefined;
  return { round_id: round, score: v.score };
}
export function ratingCopyErrorCode(operation: RatingCopyOperation, status: number, code: unknown) {
  if (status === 400 && code === 'ranking.invalid_rating_copy') return code;
  if (status === 404 && code === 'ranking.not_found') return code;
  if (status === 503 && code === 'ranking.rating_copy_unavailable') return code;
  if (
    operation === 'apply' &&
    status === 409 &&
    (code === 'ranking.rating_copy_stale' || code === 'ranking.rating_exists')
  )
    return code;
  return undefined;
}
