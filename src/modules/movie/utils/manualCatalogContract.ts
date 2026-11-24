export const MANUAL_CATALOG_PATH = '/restricted/movies/catalog/manual';
export const MANUAL_CATALOG_BODY_LIMIT = 32 * 1024;
const genreMaximum = 32;
export interface ManualCatalogCreateInput {
  command_id: string;
  portuguese_title?: string | null;
  english_title?: string | null;
  original_title?: string | null;
  director?: string | null;
  description?: string | null;
  release_date?: string | null;
  runtime?: number | null;
  genre_ids?: readonly number[];
}
export interface ManualCatalogReceipt {
  movie_id: string;
}

const commandId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const movieId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const fields = [
  'command_id',
  'portuguese_title',
  'english_title',
  'original_title',
  'director',
  'description',
  'release_date',
  'runtime',
  'genre_ids',
];
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function scalar(v: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(v, key) ? v[key] : null;
}
function javaSpace(character: string) {
  const cp = character.codePointAt(0)!;
  return (cp >= 9 && cp <= 13) || (cp >= 28 && cp <= 31) || /\p{Z}/u.test(character);
}
function text(v: unknown, maximum: number, newlines = false): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const values = Array.from(v);
  let start = 0,
    end = values.length;
  while (start < end && javaSpace(values[start]!)) start++;
  while (end > start && javaSpace(values[end - 1]!)) end--;
  if (end === start || end - start > maximum) return undefined;
  const trimmed = values.slice(start, end);
  if (
    trimmed.some((ch) => {
      const cp = ch.codePointAt(0)!;
      return (
        (cp >= 0xd800 && cp <= 0xdfff) ||
        ((cp <= 31 || (cp >= 127 && cp <= 159)) && !(newlines && (cp === 10 || cp === 13)))
      );
    })
  )
    return undefined;
  return trimmed.join('');
}
function civilDate(v: unknown): v is string {
  if (typeof v !== 'string' || v.length !== 10 || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v))
    return false;
  const [year, month, day] = v.split('-').map(Number) as [number, number, number];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && day > 0 && day <= (days[month - 1] ?? 0);
}
export function normalizeManualCatalogInput(value: unknown): ManualCatalogCreateInput | undefined {
  const input = record(value);
  if (!input || Object.keys(input).some((key) => !fields.includes(key))) return undefined;
  const command_id = scalar(input, 'command_id');
  if (typeof command_id !== 'string' || command_id.length !== 36 || !commandId.test(command_id))
    return undefined;
  const portuguese_title = text(scalar(input, 'portuguese_title'), 150);
  const english_title = text(scalar(input, 'english_title'), 150);
  const original_title = text(scalar(input, 'original_title'), 150);
  const director = text(scalar(input, 'director'), 150);
  const description = text(scalar(input, 'description'), 4000, true);
  const release_date = scalar(input, 'release_date');
  const runtime = scalar(input, 'runtime');
  const ids = Object.hasOwn(input, 'genre_ids') ? input.genre_ids : [];
  if (
    portuguese_title === undefined ||
    english_title === undefined ||
    original_title === undefined ||
    (!portuguese_title && !english_title && !original_title) ||
    director === undefined ||
    description === undefined ||
    (release_date !== null && !civilDate(release_date)) ||
    (runtime !== null &&
      (typeof runtime !== 'number' ||
        !Number.isInteger(runtime) ||
        runtime < 1 ||
        runtime > 999)) ||
    !Array.isArray(ids) ||
    ids.length > genreMaximum
  )
    return undefined;

  const unique = new Set<number>();
  for (const id of ids) {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1 || unique.has(id))
      return undefined;
    unique.add(id);
  }
  return {
    command_id,
    portuguese_title,
    english_title,
    original_title,
    director,
    description,
    release_date,
    runtime,
    genre_ids: [...unique].sort((a, b) => a - b),
  };
}
export function manualCatalogReceipt(value: unknown): ManualCatalogReceipt | undefined {
  const v = record(value);
  if (!v || Object.keys(v).length !== 1 || !Object.hasOwn(v, 'movie_id')) return undefined;
  const id = v.movie_id;
  return typeof id === 'string' && id.length === 36 && movieId.test(id)
    ? { movie_id: id }
    : undefined;
}
export function manualCatalogErrorCode(
  status: number,
  code: unknown,
  operation: 'proof' | 'create',
) {
  if (status === 400 && code === 'catalog.invalid_manual_movie') return code;
  if (status === 403 && code === 'catalog.manual_forbidden') return code;
  if (status === 409 && operation === 'create' && code === 'catalog.manual_command_conflict')
    return code;
  return undefined;
}
