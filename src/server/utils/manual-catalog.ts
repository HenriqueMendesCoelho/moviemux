import { createError } from 'nuxt/server';
import {
  MANUAL_CATALOG_BODY_LIMIT,
  MANUAL_CATALOG_PATH,
  manualCatalogErrorCode,
  manualCatalogReceipt,
  normalizeManualCatalogInput,
} from '../../modules/movie/utils/manualCatalogContract';

type Operation = 'proof' | 'create';
export function manualCatalogOperation(path: string, method: string): Operation | undefined {
  if (path !== MANUAL_CATALOG_PATH) return undefined;
  return method === 'GET' ? 'proof' : method === 'POST' ? 'create' : undefined;
}
export function invalidManualCatalog(): never {
  throw createError({
    status: 400,
    message: 'Invalid manual catalog request',
    data: { code: 'catalog.invalid_manual_movie' },
  });
}
const string = new RegExp(
  String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`,
  'y',
);
const space = /[ \t\r\n]*/y;
const scalar = /(?:null|0|[1-9][0-9]{0,15})/y;

// Allow only this DTO's exact root object, scalar values and one flat genre
// array; detect duplicate decoded keys and never coerce lexical JSON numbers.
function strictObject(raw: string, limit: number): Record<string, unknown> | undefined {
  if (Buffer.byteLength(raw, 'utf8') > limit) return undefined;
  let pos = 0;
  function token(pattern: RegExp) {
    pattern.lastIndex = pos;
    const match = pattern.exec(raw);
    if (!match) return undefined;
    pos = pattern.lastIndex;
    return match[0];
  }
  function quoted() {
    const match = token(string);
    return match !== undefined ? (JSON.parse(match) as string) : undefined;
  }
  function value(arrayAllowed: boolean): unknown {
    token(space);
    if (raw[pos] === '[' && arrayAllowed) {
      pos++;
      token(space);
      const items: unknown[] = [];
      if (raw[pos] === ']') {
        pos++;
        return items;
      }
      while (items.length < 32 && pos < raw.length) {
        const item = value(false);
        if (item === undefined) return undefined;
        items.push(item);
        token(space);
        const separator = raw[pos++];
        if (separator === ']') return items;
        if (separator !== ',') return undefined;
      }
      return undefined;
    }
    if (raw[pos] === '"') return quoted();
    const matched = token(scalar);
    if (matched === undefined) return undefined;
    if (matched === 'null') return null;
    const number = Number(matched);
    return Number.isSafeInteger(number) ? number : undefined;
  }
  token(space);
  if (raw[pos++] !== '{') return undefined;
  const fields: Record<string, unknown> = Object.create(null);
  while (pos < raw.length) {
    token(space);
    const key = quoted();
    token(space);
    if (key === undefined || Object.hasOwn(fields, key) || raw[pos++] !== ':') return undefined;
    const field = value(key === 'genre_ids');
    if (field === undefined) return undefined;
    fields[key] = field;
    token(space);
    const separator = raw[pos++];
    if (separator === '}') {
      token(space);
      return pos === raw.length ? fields : undefined;
    }
    if (separator !== ',') return undefined;
  }
  return undefined;
}
export function manualCatalogCreateBody(raw: string | undefined, contentType: string | undefined) {
  const input =
    contentType === 'application/json' && raw
      ? normalizeManualCatalogInput(strictObject(raw, MANUAL_CATALOG_BODY_LIMIT))
      : undefined;
  return input ? JSON.stringify(input) : invalidManualCatalog();
}
export function manualCatalogUpstreamError(phase: Operation, status: number, raw: string) {
  const candidate = strictObject(raw, 1024);
  return candidate && Object.keys(candidate).length === 1
    ? manualCatalogErrorCode(status, candidate.code, phase)
    : undefined;
}
export function manualCatalogUpstreamResponse(phase: Operation, status: number, raw: string) {
  if (phase === 'proof' && status === 204 && raw === '') return { status, data: null };
  if (phase === 'create' && (status === 200 || status === 201)) {
    const data = manualCatalogReceipt(strictObject(raw, 1024));
    if (data) return { status, data };
  }
  throw createError({ status: 502, message: 'Unconfirmed manual catalog response' });
}
