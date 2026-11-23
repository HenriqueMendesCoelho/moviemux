import api from '~/core/http';
import { rankingSummary, rankingIdPattern } from './RankingService';
export interface RankingAccess {
  ranking_id: string;
  capabilities: string[];
}
export interface RankingEntry {
  entry_id: string;
  movie_id: string;
  tmdb_id: number | null;
  original_title: string | null;
  english_title: string | null;
  portuguese_title: string | null;
  url_image: string | null;
  release_date: string | null;
  runtime: number | null;
  created_at: string;
}
export interface RankingRound {
  round_id: string;
  number: number;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  revealed: boolean | null;
}
export interface Page<T, C> {
  items: T[];
  next_cursor: C | null;
}
export interface OwnRating {
  round_id: string;
  score: number | null;
}
export interface RatingAggregate {
  entry_id: string;
  total: bigint;
  votes: bigint;
  partial: boolean;
}
function check(ok: unknown): asserts ok {
  if (!ok) throw new Error('Invalid ranking projection');
}
function record(v: unknown): Record<string, unknown> {
  check(v && typeof v === 'object' && !Array.isArray(v));
  return v as Record<string, unknown>;
}
function id(v: unknown): v is string {
  return typeof v === 'string' && rankingIdPattern.test(v);
}
function path(...ids: string[]) {
  check(ids.every(id));
  return `/rankings/${ids[0]}`;
}
const nullableText = (v: unknown) => v === null || typeof v === 'string';
const nullableInteger = (v: unknown) => v === null || Number.isSafeInteger(v);
export function entryProjection(value: unknown): RankingEntry {
  const v = record(value);
  check(
    id(v.entry_id) &&
      id(v.movie_id) &&
      nullableInteger(v.tmdb_id) &&
      nullableInteger(v.runtime) &&
      typeof v.created_at === 'string',
  );
  for (const key of [
    'original_title',
    'english_title',
    'portuguese_title',
    'url_image',
    'release_date',
  ])
    check(nullableText(v[key]));
  return Object.fromEntries(
    [
      'entry_id',
      'movie_id',
      'tmdb_id',
      'original_title',
      'english_title',
      'portuguese_title',
      'url_image',
      'release_date',
      'runtime',
      'created_at',
    ].map((k) => [k, v[k]]),
  ) as unknown as RankingEntry;
}
export function roundProjection(value: unknown): RankingRound {
  const v = record(value);
  check(
    id(v.round_id) &&
      Number.isSafeInteger(v.number) &&
      Number(v.number) > 0 &&
      nullableText(v.description) &&
      typeof v.created_at === 'string' &&
      nullableText(v.updated_at) &&
      (v.revealed === null || typeof v.revealed === 'boolean'),
  );
  return Object.fromEntries(
    ['round_id', 'number', 'description', 'created_at', 'updated_at', 'revealed'].map((k) => [
      k,
      v[k],
    ]),
  ) as unknown as RankingRound;
}
function page<T, C>(
  value: unknown,
  item: (v: unknown) => T,
  cursor: (v: unknown) => boolean,
): Page<T, C> {
  const v = record(value);
  check(Array.isArray(v.items) && (v.next_cursor === null || cursor(v.next_cursor)));
  return { items: v.items.map(item), next_cursor: v.next_cursor as C | null };
}
/** Read exact integer tokens, rejecting rounded/unsupported JSON parsing instead of fabricating precision. */
export function parseAggregate(text: unknown, expected: string): RatingAggregate {
  check(typeof text === 'string');
  const v = record(
    JSON.parse(text, (key: string, value: unknown, context?: { source?: string }) => {
      if (key !== 'total' && key !== 'votes') return value;
      check(typeof value === 'number');
      const token = context?.source ?? (Number.isSafeInteger(value) ? String(value) : '');
      check(/^-?\d+$/.test(token));
      return BigInt(token);
    }),
  );
  check(
    v.entry_id === expected &&
      typeof v.total === 'bigint' &&
      typeof v.votes === 'bigint' &&
      v.votes >= 0n &&
      typeof v.partial === 'boolean',
  );
  return { entry_id: expected, total: v.total, votes: v.votes, partial: v.partial };
}
export function entryTitle(entry: RankingEntry, locale: string, fallback: string) {
  return (
    (locale === 'pt-BR' ? entry.portuguese_title : entry.english_title) ||
    entry.original_title ||
    entry.english_title ||
    fallback
  );
}
export default {
  async summary(ranking: string, signal?: AbortSignal) {
    const { data } = await api.get(path(ranking), { signal });
    const result = rankingSummary(data);
    check(result.ranking_id === ranking);
    return result;
  },
  async access(ranking: string, signal?: AbortSignal): Promise<RankingAccess> {
    const { data } = await api.get(`${path(ranking)}/access`, { signal });
    const v = record(data);
    check(
      v.ranking_id === ranking &&
        Array.isArray(v.capabilities) &&
        v.capabilities.every((c) => typeof c === 'string'),
    );
    return { ranking_id: ranking, capabilities: v.capabilities as string[] };
  },
  async entries(ranking: string, after?: string, signal?: AbortSignal) {
    check(!after || id(after));
    const { data } = await api.get(`${path(ranking)}/entries`, {
      params: { limit: 20, ...(after ? { after } : {}) },
      signal,
    });
    return page<RankingEntry, string>(data, entryProjection, id);
  },
  async rounds(ranking: string, entry: string, afterNumber?: number, signal?: AbortSignal) {
    check(afterNumber === undefined || (Number.isSafeInteger(afterNumber) && afterNumber > 0));
    const { data } = await api.get(`${path(ranking, entry)}/entries/${entry}/rounds`, {
      params: { limit: 20, ...(afterNumber === undefined ? {} : { afterNumber }) },
      signal,
    });
    return page<RankingRound, number>(
      data,
      roundProjection,
      (v) => Number.isSafeInteger(v) && Number(v) > 0,
    );
  },
  async ownRating(ranking: string, round: string, signal?: AbortSignal): Promise<OwnRating> {
    const { data } = await api.get(`${path(ranking, round)}/rounds/${round}/rating/me`, { signal });
    const v = record(data);
    check(v.round_id === round && nullableInteger(v.score));
    return { round_id: round, score: v.score as number | null };
  },
  async aggregate(ranking: string, entry: string, signal?: AbortSignal) {
    const { data } = await api.get(`${path(ranking, entry)}/entries/${entry}/ratings/aggregate`, {
      signal,
      responseType: 'text',
      transformResponse: [(value: unknown) => value],
    });
    return parseAggregate(data, entry);
  },
};
