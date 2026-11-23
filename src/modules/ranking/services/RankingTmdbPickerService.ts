import api from '~/core/http';
import { rankingIdPattern } from './RankingService';
export type PickerLanguage = 'pt-BR' | 'en-US';
export interface PickerMovie {
  tmdb_id: number;
  title: string;
  original_title: string | null;
  release_date: string | null;
  poster_path: string | null;
}
export interface PickerPage {
  items: PickerMovie[];
  page: number;
  has_more: boolean;
}
export interface ImportReceipt {
  entryId: string;
  disposition: 'new' | 'existing' | 'verified';
}
function invalid(): never {
  throw new Error('Invalid ranking TMDB projection');
}
function endpoint(rankingId: string, enabled: boolean) {
  if (!enabled || !rankingIdPattern.test(rankingId)) return invalid();
  return `/rankings/${rankingId}/entries/tmdb`;
}
function exact(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  if (Object.keys(value).length !== keys.length || !keys.every((k) => Object.hasOwn(value, k)))
    return invalid();
  return value as Record<string, unknown>;
}
export function pickerQuery(query: string): string | null {
  const trimmed = query.trim();
  const length = Array.from(trimmed).length;
  return length >= 2 && length <= 120 ? trimmed : null;
}
export function isTmdbPickerPoster(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 255 &&
    /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(value)
  );
}
function isoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validId(id: unknown): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
}
function movie(value: unknown): PickerMovie {
  const v = exact(value, ['tmdb_id', 'title', 'original_title', 'release_date', 'poster_path']);
  if (
    !validId(v.tmdb_id) ||
    typeof v.title !== 'string' ||
    !v.title.trim() ||
    !(v.original_title === null || typeof v.original_title === 'string') ||
    !(v.release_date === null || isoDate(v.release_date)) ||
    !(v.poster_path === null || isTmdbPickerPoster(v.poster_path))
  )
    return invalid();
  return {
    tmdb_id: v.tmdb_id,
    title: v.title,
    original_title: v.original_title,
    release_date: v.release_date,
    poster_path: v.poster_path,
  };
}
export default {
  async search(
    rankingId: string,
    query: string,
    page: number,
    language: PickerLanguage,
    enabled = false,
    signal?: AbortSignal,
  ): Promise<PickerPage> {
    const path = endpoint(rankingId, enabled);
    const trimmed = pickerQuery(query);
    if (
      trimmed === null ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 20 ||
      !(language === 'pt-BR' || language === 'en-US')
    )
      return invalid();
    const { status, data } = await api.post(
      `${path}/search`,
      { query: trimmed, page, language },
      { signal },
    );
    if (status !== 200) return invalid();
    const v = exact(data, ['items', 'page', 'has_more']);
    if (
      v.page !== page ||
      !Array.isArray(v.items) ||
      v.items.length > 20 ||
      typeof v.has_more !== 'boolean' ||
      (v.has_more && (page === 20 || v.items.length === 0))
    )
      return invalid();
    return { items: v.items.map(movie), page, has_more: v.has_more };
  },
  async add(rankingId: string, tmdbId: number, enabled = false): Promise<ImportReceipt> {
    const path = endpoint(rankingId, enabled);
    if (!validId(tmdbId)) return invalid();
    const { status, data } = await api.post(path, { tmdb_id: tmdbId });
    if (status !== 201 && status !== 200) return invalid();
    const v = exact(data, ['entry_id']);
    if (typeof v.entry_id !== 'string' || !rankingIdPattern.test(v.entry_id)) return invalid();
    return { entryId: v.entry_id, disposition: status === 201 ? 'new' : 'existing' };
  },
};
