import { createError } from 'nuxt/server';
import {
  CATALOG_PICKER_PAGE_SIZE,
  catalogPickerEntryId,
  catalogPickerErrorCode,
  catalogPickerPage,
  catalogPickerSearchBody,
  isCatalogPickerId,
  type CatalogPickerOperation,
} from '../../modules/ranking/utils/catalogPickerContract';
import { exactRecord } from '../../modules/ranking/utils/ratingCopyContract';

const uuid = '[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}';
const pathPattern = new RegExp(`^/rankings/${uuid}/entries/catalog(/search)?$`);
const knownShape = /^\/rankings\/[a-zA-Z0-9_-]{1,128}\/entries\/catalog(\/search)?$/;
export const CATALOG_PICKER_BODY_LIMIT = 8192;
function operationOn(
  pattern: RegExp,
  path: string,
  method: string,
): CatalogPickerOperation | undefined {
  if (method !== 'POST') return undefined;
  const m = pattern.exec(path);
  if (m?.[0].length !== path.length) return undefined;
  return m[1] ? 'search' : 'attach';
}
export function catalogPickerOperation(path: string, method: string) {
  return operationOn(pathPattern, path, method);
}
export function malformedCatalogPickerOperation(path: string, method: string) {
  return catalogPickerOperation(path, method) ? undefined : operationOn(knownShape, path, method);
}
export function invalidCatalogPicker(operation: CatalogPickerOperation): never {
  throw createError({
    status: 400,
    message: 'Invalid contextual catalog request',
    data: {
      code:
        operation === 'search' ? 'ranking.invalid_catalog_search' : 'ranking.invalid_catalog_entry',
    },
  });
}

const string = new RegExp(
  String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`,
  'y',
);
const space = /[ \t\r\n]*/y;
const scalar = /(?:null|true|false|0|[1-9][0-9]?)/y;
// Exact small grammar for the wire DTOs: one array, flat row objects, decoded
// key uniqueness and integer token syntax. No recursive input beyond the DTO.
function catalogJson(raw: string, limit: number): unknown {
  if (Buffer.byteLength(raw, 'utf8') > limit) return undefined;
  let pos = 0;
  function token(pattern: RegExp) {
    pattern.lastIndex = pos;
    const found = pattern.exec(raw);
    if (!found) return undefined;
    pos = pattern.lastIndex;
    return found[0];
  }
  function quoted() {
    const matched = token(string);
    return matched !== undefined ? (JSON.parse(matched) as string) : undefined;
  }
  function value(depth: number): unknown {
    token(space);
    if (raw[pos] === '{' && (depth === 0 || depth === 2)) {
      pos++;
      const fields: Record<string, unknown> = Object.create(null);
      token(space);
      if (raw[pos] === '}') {
        pos++;
        return fields;
      }
      while (pos < raw.length) {
        token(space);
        const key = quoted();
        token(space);
        if (key === undefined || Object.hasOwn(fields, key) || raw[pos++] !== ':') return undefined;
        const v = value(depth + 1);
        if (v === undefined) return undefined;
        fields[key] = v;
        token(space);
        const separator = raw[pos++];
        if (separator === '}') return fields;
        if (separator !== ',') return undefined;
      }
    } else if (raw[pos] === '[' && depth === 1) {
      pos++;
      const items: unknown[] = [];
      token(space);
      if (raw[pos] === ']') {
        pos++;
        return items;
      }
      while (items.length < CATALOG_PICKER_PAGE_SIZE && pos < raw.length) {
        const v = value(depth + 1);
        if (v === undefined) return undefined;
        items.push(v);
        token(space);
        const separator = raw[pos++];
        if (separator === ']') return items;
        if (separator !== ',') return undefined;
      }
    } else if (raw[pos] === '"') return quoted();
    else {
      const literal = token(scalar);
      if (literal !== undefined)
        return literal === 'null'
          ? null
          : literal === 'true'
            ? true
            : literal === 'false'
              ? false
              : Number(literal);
    }
    return undefined;
  }
  const parsed = value(0);
  token(space);
  return pos === raw.length ? parsed : undefined;
}

export function rankingCatalogPickerBody(
  operation: CatalogPickerOperation,
  raw?: string,
  contentType?: string,
) {
  if (contentType !== 'application/json' || !raw) return invalidCatalogPicker(operation);
  const parsed = catalogJson(raw, CATALOG_PICKER_BODY_LIMIT);
  if (operation === 'search') {
    const body = catalogPickerSearchBody(parsed);
    return body ? JSON.stringify(body) : invalidCatalogPicker(operation);
  }
  const movie = exactRecord(parsed, 'movie_id')?.movie_id;
  return isCatalogPickerId(movie)
    ? JSON.stringify({ movie_id: movie })
    : invalidCatalogPicker(operation);
}
export function rankingCatalogPickerError(
  operation: CatalogPickerOperation,
  status: number,
  raw: string,
) {
  return catalogPickerErrorCode(
    operation,
    status,
    exactRecord(catalogJson(raw, 1024), 'code')?.code,
  );
}
export function rankingCatalogPickerResponse(
  operation: CatalogPickerOperation,
  status: number,
  raw: string,
  requestBody?: string,
) {
  if (operation === 'search' && status === 200 && requestBody) {
    const body = catalogPickerSearchBody(catalogJson(requestBody, CATALOG_PICKER_BODY_LIMIT));
    const data = body && catalogPickerPage(catalogJson(raw, 512 * 1024), body.page);
    if (data) return { status, data };
  } else if (operation === 'attach' && (status === 200 || status === 201)) {
    const entry_id = catalogPickerEntryId(catalogJson(raw, 1024));
    if (entry_id) return { status, data: { entry_id } };
  }
  throw createError({ status: 502, message: 'Unconfirmed contextual catalog response' });
}
