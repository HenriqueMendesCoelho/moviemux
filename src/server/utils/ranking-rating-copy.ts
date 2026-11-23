import { createError } from 'nuxt/server';
import {
  canonicalCopyId,
  exactRecord,
  isRatingCopyToken,
  parseRatingCopyPreview,
  parseRatingCopyReceipt,
  ratingCopyErrorCode,
  type RatingCopyOperation,
} from '../../modules/ranking/utils/ratingCopyContract';

const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const pathPattern = new RegExp(
  `^/rankings/${uuid}/entries/${uuid}/rounds/(${uuid})/rating/me/copy-(preview|apply)$`,
);
const invalidCode = 'ranking.invalid_rating_copy';
// JSON strings permit escaped controls, never literal ones.
// eslint-disable-next-line no-control-regex
const jsonString = /"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
const ws = /[ \t\r\n]*/y;
const scalar = /(?:null|0|[1-9][0-9]?)/y;

interface Operation {
  kind: RatingCopyOperation;
  round: string;
}
export function rankingRatingCopyOperation(path: string, method: string): Operation | undefined {
  if (method !== 'POST') return undefined;
  const match = pathPattern.exec(path);
  if (!match?.[1] || match[0].length !== path.length) return undefined;
  return { kind: match[2] === 'preview' ? 'preview' : 'apply', round: match[1] };
}
export function ratingCopyBodyLimit(operation: Operation) {
  return operation.kind === 'preview' ? 1024 : 2048;
}
export function invalidRatingCopy(): never {
  throw createError({
    status: 400,
    message: 'Invalid rating copy request',
    data: { code: invalidCode },
  });
}

// A bounded grammar for exactly these small nested DTOs. JSON.parse alone
// would normalize duplicate/escaped keys before shape validation.
function strictObject(raw: string, limit: number): Record<string, unknown> | undefined {
  if (Buffer.byteLength(raw, 'utf8') > limit) return undefined;
  let pos = 0;
  function token(pattern: RegExp) {
    pattern.lastIndex = pos;
    const m = pattern.exec(raw);
    if (!m) return undefined;
    pos = pattern.lastIndex;
    return m[0];
  }
  function string() {
    const value = token(jsonString);
    return value === undefined ? undefined : (JSON.parse(value) as string);
  }
  function object(depth: number): Record<string, unknown> | undefined {
    token(ws);
    if (raw[pos++] !== '{') return undefined;
    const fields: Record<string, unknown> = Object.create(null);
    token(ws);
    if (raw[pos] === '}') {
      pos++;
      return fields;
    }
    while (pos < raw.length) {
      token(ws);
      const key = string();
      token(ws);
      if (key === undefined || Object.hasOwn(fields, key) || raw[pos++] !== ':') return undefined;
      token(ws);
      if (raw[pos] === '{') {
        const nested = depth === 0 ? object(1) : undefined;
        if (!nested) return undefined;
        fields[key] = nested;
      } else if (raw[pos] === '"') {
        const value = string();
        if (value === undefined) return undefined;
        fields[key] = value;
      } else {
        const value = token(scalar);
        if (value === undefined) return undefined;
        fields[key] = value === 'null' ? null : Number(value);
      }
      token(ws);
      const separator = raw[pos++];
      if (separator === '}') return fields;
      if (separator !== ',') return undefined;
    }
    return undefined;
  }
  const output = object(0);
  token(ws);
  return pos === raw.length ? output : undefined;
}
export function rankingRatingCopyBody(operation: Operation, raw?: string, contentType?: string) {
  if (contentType !== 'application/json' || !raw) return invalidRatingCopy();
  const body = strictObject(raw, ratingCopyBodyLimit(operation));
  if (operation.kind === 'apply') {
    const v = exactRecord(body, 'preview_token');
    if (!isRatingCopyToken(v?.preview_token)) return invalidRatingCopy();
    return JSON.stringify({ preview_token: v.preview_token });
  }
  const v = exactRecord(exactRecord(body, 'source')?.source, 'ranking_id', 'entry_id', 'round_id');
  const ranking_id = canonicalCopyId(v?.ranking_id);
  const entry_id = canonicalCopyId(v?.entry_id);
  const round_id = canonicalCopyId(v?.round_id);
  if (!ranking_id || !entry_id || !round_id) return invalidRatingCopy();
  return JSON.stringify({ source: { ranking_id, entry_id, round_id } });
}
export function rankingRatingCopyError(operation: Operation, status: number, raw: string) {
  return ratingCopyErrorCode(
    operation.kind,
    status,
    exactRecord(strictObject(raw, 1024), 'code')?.code,
  );
}
export function rankingRatingCopyResponse(operation: Operation, status: number, raw: string) {
  const v = strictObject(raw, 2048);
  if (operation.kind === 'preview') {
    const data = parseRatingCopyPreview(v);
    if (status === 200 && data) return { status, data };
  } else {
    const data = parseRatingCopyReceipt(v, operation.round);
    if (status === 201 && data) return { status, data };
  }
  throw createError({ status: 502, message: 'Unconfirmed rating copy response' });
}
