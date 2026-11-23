import { createError } from 'nuxt/server';

const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const endpoint = new RegExp(`^/rankings/${uuid}/entries/tmdb(/search)?$`);
type Operation = 'search' | 'import';
export function rankingTmdbOperation(path: string, method: string): Operation | undefined {
  if (method !== 'POST') return undefined;
  const result = endpoint.exec(path);
  return result ? (result[1] ? 'search' : 'import') : undefined;
}
function invalid(operation: Operation): never {
  throw createError({
    status: 400,
    message: 'Invalid ranking request',
    data: {
      code: operation === 'search' ? 'ranking.invalid_tmdb_search' : 'ranking.invalid_tmdb_id',
    },
  });
}
function flatTokens(body: string): Map<string, string | number> | undefined {
  // Preserve integer token syntax and reject duplicate decoded keys before forwarding.
  // All accepted request fields are JSON strings or positive integer literals.
  const inner = /^[ \t\r\n]*\{([\s\S]*)\}[ \t\r\n]*$/.exec(body)?.[1];
  if (inner === undefined) return undefined;
  const string = String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
  const whitespace = String.raw`[ \t\r\n]*`;
  const field = new RegExp(
    `${whitespace}(${string})${whitespace}:${whitespace}(${string}|[1-9][0-9]*)${whitespace}(,|$)`,
    'gy',
  );
  const values = new Map<string, string | number>();
  while (field.lastIndex < inner.length) {
    const match = field.exec(inner);
    if (!match?.[1] || !match?.[2]) return undefined;
    const key: string = JSON.parse(match[1]);
    if (values.has(key)) return undefined;
    values.set(key, match[2].startsWith('"') ? JSON.parse(match[2]) : Number(match[2]));
    if (match[3] === ',' && field.lastIndex === inner.length) return undefined;
  }
  return values;
}
function safeId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
export function rankingTmdbBody(
  operation: Operation,
  body: string | undefined,
  contentType: string | undefined,
) {
  if (contentType !== 'application/json')
    throw createError({ status: 415, message: 'JSON request required' });
  const values = flatTokens(body || '');
  if (!values) return invalid(operation);
  if (operation === 'import') {
    const id = values.get('tmdb_id');
    return values.size === 1 && safeId(id) ? JSON.stringify({ tmdb_id: id }) : invalid(operation);
  }
  const query = values.get('query'),
    page = values.get('page'),
    language = values.get('language');
  if (
    values.size !== 3 ||
    typeof query !== 'string' ||
    !safeId(page) ||
    page > 20 ||
    !(language === 'pt-BR' || language === 'en-US')
  )
    return invalid(operation);
  const trimmed = query.trim(),
    length = Array.from(trimmed).length;
  if (length < 2 || length > 120) return invalid(operation);
  return JSON.stringify({ query: trimmed, page, language });
}
const sharedErrors: Record<number, string[]> = {
  502: ['ranking.tmdb_invalid_response'],
  503: ['ranking.tmdb_import_unavailable', 'ranking.tmdb_unavailable'],
};
const searchErrors: Record<number, string[]> = {
  400: ['ranking.invalid_tmdb_search'],
  404: ['ranking.not_found'],
  409: ['ranking.archived_read_only'],
};
const importErrors: Record<number, string[]> = {
  400: ['ranking.invalid_tmdb_id'],
  404: ['ranking.not_found', 'ranking.tmdb_not_found'],
  409: [
    'ranking.archived_read_only',
    'ranking.entry_recovery_expired',
    'ranking.catalog_identity_conflict',
  ],
};
export function rankingTmdbError(
  operation: Operation,
  status: number,
  text: string,
): string | undefined {
  const candidates =
    sharedErrors[status] || (operation === 'search' ? searchErrors : importErrors)[status];
  if (!candidates) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    if (
      value &&
      typeof value === 'object' &&
      'code' in value &&
      typeof value.code === 'string' &&
      candidates.includes(value.code)
    )
      return value.code;
  } catch {
    /* Unknown upstream errors remain generic. */
  }
  return undefined;
}
function dateOnly(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function invalidResponse(): never {
  throw createError({
    status: 502,
    message: 'Invalid API response',
    data: { code: 'ranking.tmdb_invalid_response' },
  });
}
export function rankingTmdbResponse(
  operation: Operation,
  status: number,
  data: unknown,
  requestBody?: string,
) {
  const value = record(data);
  if (operation === 'import') {
    if (
      (status !== 200 && status !== 201) ||
      typeof value?.entry_id !== 'string' ||
      !new RegExp(`^${uuid}$`).test(value.entry_id)
    )
      throw createError({ status: 502, message: 'Unconfirmed ranking import response' });
    return { entry_id: value.entry_id };
  }
  const expectedPage = flatTokens(requestBody || '')?.get('page');
  if (
    status !== 200 ||
    typeof expectedPage !== 'number' ||
    !value ||
    value.page !== expectedPage ||
    !Array.isArray(value.items) ||
    value.items.length > 20 ||
    typeof value.has_more !== 'boolean' ||
    (value.has_more && (expectedPage >= 20 || value.items.length === 0))
  )
    return invalidResponse();
  const items = value.items.map((item: unknown) => {
    const row = record(item);
    if (
      !row ||
      !safeId(row.tmdb_id) ||
      typeof row.title !== 'string' ||
      !row.title.trim() ||
      !(row.original_title === null || typeof row.original_title === 'string') ||
      !(row.release_date === null || dateOnly(row.release_date)) ||
      !(
        row.poster_path === null ||
        (typeof row.poster_path === 'string' &&
          row.poster_path.length <= 255 &&
          /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(row.poster_path))
      )
    )
      return invalidResponse();
    return {
      tmdb_id: row.tmdb_id,
      title: row.title,
      original_title: row.original_title,
      release_date: row.release_date,
      poster_path: row.poster_path,
    };
  });
  return { items, page: expectedPage, has_more: value.has_more };
}
