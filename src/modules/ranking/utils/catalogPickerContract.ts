import { canonicalCopyId, exactRecord } from './ratingCopyContract';

export type CatalogPickerLanguage = 'pt-BR' | 'en-US';
export type CatalogPickerOperation = 'search' | 'attach';
export interface CatalogPickerMovie {
  movie_id: string;
  title: string;
  release_date: string | null;
}
export interface CatalogPickerPage {
  items: CatalogPickerMovie[];
  page: number;
  has_more: boolean;
}
export interface CatalogAttachReceipt {
  entryId: string;
  disposition: 'new' | 'existing';
}
export const CATALOG_PICKER_MAX_PAGE = 20;
export const CATALOG_PICKER_PAGE_SIZE = 20;

function javaSpace(character: string) {
  const code = character.codePointAt(0) ?? -1;
  return (code >= 9 && code <= 13) || (code >= 28 && code <= 31) || /\p{Z}/u.test(character);
}
export function catalogPickerQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Match the catalog controller's trim contract. JS trim also strips FEFF
  // and misses U+001C..U+001F, changing limits and literal search semantics.
  const chars = Array.from(value);
  let first = 0,
    end = chars.length;
  while (first < end && javaSpace(chars[first]!)) first++;
  while (end > first && javaSpace(chars[end - 1]!)) end--;
  if (end - first < 2 || end - first > 120) return null;
  const normalized = chars.slice(first, end);
  if (
    normalized.some((character) => {
      const code = character.codePointAt(0)!;
      return code <= 31 || (code >= 127 && code <= 159) || (code >= 0xd800 && code <= 0xdfff);
    })
  )
    return null;
  return normalized.join('');
}
export function catalogPickerSearchBody(value: unknown) {
  const record = exactRecord(value, 'query', 'page', 'language');
  if (!record) return undefined;
  const query = catalogPickerQuery(record.query);
  const { page, language } = record;
  if (
    query === null ||
    typeof page !== 'number' ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > CATALOG_PICKER_MAX_PAGE ||
    (language !== 'pt-BR' && language !== 'en-US')
  )
    return undefined;
  return { query, page, language };
}
export function isCatalogPickerId(value: unknown): value is string {
  return typeof value === 'string' && canonicalCopyId(value) === value;
}
function isoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // LocalDate uses full ISO calendar dates (signed extended years only outside YYYY).
  const m = /^((?:[0-9]{4}|-[0-9]{4,9}|[+][1-9][0-9]{4,8}))-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!m || m[0].length !== value.length || m[1] === '-0000') return false;
  const year = Number(m[1]),
    month = Number(m[2]),
    day = Number(m[3]);
  if (m[1]?.startsWith('-') && '-' + String(Math.abs(year)).padStart(4, '0') !== m[1]) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= (days[month - 1] ?? 0);
}
export function catalogPickerPage(
  value: unknown,
  expectedPage: number,
): CatalogPickerPage | undefined {
  const record = exactRecord(value, 'items', 'page', 'has_more');
  if (
    !record ||
    record.page !== expectedPage ||
    typeof record.has_more !== 'boolean' ||
    !Array.isArray(record.items) ||
    record.items.length > CATALOG_PICKER_PAGE_SIZE ||
    (record.has_more &&
      (expectedPage >= CATALOG_PICKER_MAX_PAGE || record.items.length !== CATALOG_PICKER_PAGE_SIZE))
  )
    return undefined;
  const items: CatalogPickerMovie[] = [];
  const seen = new Set<string>();
  for (const item of record.items) {
    const movie = exactRecord(item, 'movie_id', 'title', 'release_date');
    if (!movie) return undefined;
    const { movie_id, title, release_date } = movie;
    if (
      !isCatalogPickerId(movie_id) ||
      seen.has(movie_id) ||
      typeof title !== 'string' ||
      Array.from(title).every(javaSpace) ||
      (release_date !== null && !isoDate(release_date))
    )
      return undefined;
    seen.add(movie_id);
    items.push({ movie_id, title, release_date });
  }
  return { items, page: expectedPage, has_more: record.has_more };
}
export function catalogPickerEntryId(value: unknown): string | undefined {
  const v = exactRecord(value, 'entry_id');
  return isCatalogPickerId(v?.entry_id) ? v.entry_id : undefined;
}
export function catalogPickerErrorCode(
  kind: CatalogPickerOperation,
  status: number,
  code: unknown,
) {
  if (status === 400 && kind === 'search' && code === 'ranking.invalid_catalog_search') return code;
  if (status === 400 && kind === 'attach' && code === 'ranking.invalid_catalog_entry') return code;
  if (status === 404 && code === 'ranking.not_found') return code;
  if (status === 409 && code === 'ranking.archived_read_only') return code;
  if (status === 409 && kind === 'attach' && code === 'ranking.entry_recovery_expired') return code;
  return undefined;
}
