import { QueryObserver } from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStaticQueryClient,
  staticQueryPolicies,
  MAX_RETAINED_STATIC_QUERIES,
  type StaticQueryCache,
} from 'src/core/query/StaticQueryClient';
import KitService, { normalizeDiscoverGenres } from 'src/core/services/KitService';
import MovieService from 'src/modules/movie/services/MovieService';
import { staticMetadata } from 'src/core/query/staticMetadata';

const mocks = vi.hoisted(() => ({
  app: {} as { $staticQuery?: StaticQueryCache },
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock('#app', () => ({ useNuxtApp: () => mocks.app }));
vi.mock('src/core/http', () => ({ default: { get: mocks.get, post: mocks.post } }));
const caches: StaticQueryCache[] = [];
function cache() {
  const value = createStaticQueryClient();
  caches.push(value);
  return value;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-02'));
  mocks.app = {};
  vi.clearAllMocks();
});
afterEach(() => {
  caches.splice(0).forEach((item) => item.clear());
  vi.useRealTimers();
});

describe('per-app static metadata query cache', () => {
  it('deduplicates concurrent calls, reuses fresh data and isolates consumer edits', async () => {
    const client = cache();
    const request = vi.fn(async () => ({ title: 'Original', genres: ['Drama'] }));
    const [a, b] = await Promise.all([
      client.fetch('detail', ['movie', 1], request),
      client.fetch('detail', ['movie', 1], request),
    ]);
    a.title = 'Edited';
    a.genres.push('Other');
    expect(b).toEqual({ title: 'Original', genres: ['Drama'] });
    expect(await client.fetch('detail', ['movie', 1], request)).toEqual(b);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('refetches after stale time and garbage collects inactive entries', async () => {
    const client = cache();
    const request = vi.fn(async () => 1);
    await client.fetch('browse', ['popular', 1], request);
    await vi.advanceTimersByTimeAsync(staticQueryPolicies.browse.staleTime + 1);
    await client.fetch('browse', ['popular', 1], request);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(staticQueryPolicies.browse.gcTime + 1);
    expect(client.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  it('clear aborts the HTTP signal and a late old-session result cannot repopulate cache', async () => {
    mocks.app.$staticQuery = cache();
    let resolve!: (value: { data: { id: number } }) => void;
    mocks.get.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const old = KitService.summary({ tmdb_id: 1 });
    const rejection = expect(old).rejects.toThrow();
    const signal = mocks.get.mock.calls[0]![1].signal as AbortSignal;
    mocks.app.$staticQuery.clear();
    expect(signal.aborted).toBe(true);
    mocks.get.mockResolvedValueOnce({ data: { id: 2 } });
    expect(await KitService.summary({ tmdb_id: 1 })).toEqual({ id: 2 });
    resolve({ data: { id: 1 } });
    await rejection;
    expect(await KitService.summary({ tmdb_id: 1 })).toEqual({ id: 2 });
  });
  it('separate app clients never share metadata and absent SSR plugin bypasses caching', async () => {
    const first = cache(),
      second = cache();
    expect(await first.fetch('detail', ['same'], async () => 'one')).toBe('one');
    expect(await second.fetch('detail', ['same'], async () => 'two')).toBe('two');
    mocks.get.mockResolvedValue({ data: { title: 'SSR' } });
    await staticMetadata('detail', '/movie/tmdb/1/summary');
    await staticMetadata('detail', '/movie/tmdb/1/summary');
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
  it('does not cache failed requests', async () => {
    const client = cache();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('ready');
    await expect(client.fetch('detail', ['one'], request)).rejects.toThrow('offline');
    expect(await client.fetch('detail', ['one'], request)).toBe('ready');
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('stable service integration only', () => {
  beforeEach(() => {
    mocks.app.$staticQuery = cache();
    mocks.get.mockResolvedValue({ data: { results: [] } });
  });
  it('normalizes Discover genre sets and search whitespace, but separates page/sort/year', async () => {
    await KitService.getMoviesDiscover(undefined, 1, 2026, '28,18,28');
    await KitService.getMoviesDiscover(undefined, 1, 2026, '18,28');
    expect(mocks.get).toHaveBeenCalledTimes(1);
    await KitService.getMoviesDiscover(undefined, 2, 2026, '18,28');
    await KitService.getMoviesDiscover('vote_average.asc', 1, 2026, '18,28');
    await KitService.getMoviesDiscover(undefined, 1, 2025, '18,28');
    expect(mocks.get).toHaveBeenCalledTimes(4);
    await KitService.searchByName({ query: ' Alien ' });
    await KitService.searchByName({ query: 'Alien', page: 1, language: 'pt-Br' });
    expect(mocks.get).toHaveBeenCalledTimes(5);
    expect(normalizeDiscoverGenres('28|18')).toBe('18|28');
    expect(normalizeDiscoverGenres('28,18|35')).toBe('28,18|35');
  });
  it('summary aliases deduplicate, providers and credits remain distinct', async () => {
    await KitService.summary({ tmdb_id: 1 });
    await MovieService.getMovieSummary('1');
    expect(mocks.get).toHaveBeenCalledTimes(1);
    await KitService.getWatchProviders(1);
    await KitService.getWatchProviders(1);
    await KitService.getMovieCredits(1);
    await KitService.getMovieCredits(2);
    expect(mocks.get).toHaveBeenCalledTimes(4);
  });
  it('genres204 becomes a reusable empty list, not undefined query data', async () => {
    mocks.get.mockResolvedValue({ status: 204 });
    expect(await MovieService.getMoviesGenres()).toEqual([]);
    expect(await MovieService.getMoviesGenres()).toEqual([]);
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
  it('ratings, collection and collection-dependent genres remain fresh', async () => {
    await MovieService.getMovieNotes('1');
    await MovieService.getMovieNotes('1');
    await MovieService.getMovie('1');
    await MovieService.getMovie('1');
    await MovieService.getMoviesGenresWithMovies();
    await MovieService.getMoviesGenresWithMovies();
    expect(mocks.get).toHaveBeenCalledTimes(6);
    expect(mocks.app.$staticQuery!.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('retained static query count cap', () => {
  it('retains only128 oldest-completion-ordered inactive entries, preserving returned results and refetching evictions', async () => {
    const client = cache();
    for (let id = 0; id < MAX_RETAINED_STATIC_QUERIES + 3; id++) {
      expect(await client.fetch('detail', ['movie', id], async () => ({ id }))).toEqual({ id });
      vi.setSystemTime(Date.now() + 1);
    }
    const queries = client.queryClient.getQueryCache();
    expect(queries.getAll()).toHaveLength(MAX_RETAINED_STATIC_QUERIES);
    expect(client.queryClient.getQueryData(['static-metadata', 'movie', 0])).toBeUndefined();
    const repeat = vi.fn(async () => ({ id: MAX_RETAINED_STATIC_QUERIES + 2 }));
    await client.fetch('detail', ['movie', MAX_RETAINED_STATIC_QUERIES + 2], repeat);
    expect(repeat).not.toHaveBeenCalled();
    const evicted = vi.fn(async () => ({ id: 0 }));
    await client.fetch('detail', ['movie', 0], evicted);
    expect(evicted).toHaveBeenCalledTimes(1);
    expect(queries.getAll()).toHaveLength(MAX_RETAINED_STATIC_QUERIES);
    client.clear();
    expect(queries.getAll()).toHaveLength(0);
  });

  it('does not evict inflight or observed queries or unrelated keys, and still deduplicates pending requests', async () => {
    const client = cache();
    await client.fetch('detail', ['observed'], async () => 'observed');
    const observer = new QueryObserver(client.queryClient, {
      queryKey: ['static-metadata', 'observed'],
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    client.queryClient.setQueryData(['unrelated'], 'untouched');
    let resolve!: (value: string) => void;
    const request = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const pending = client.fetch('detail', ['pending'], request);
    const duplicate = client.fetch('detail', ['pending'], request);
    try {
      for (let id = 0; id <= MAX_RETAINED_STATIC_QUERIES; id++) {
        await client.fetch('detail', ['movie', id], async () => id);
      }
      expect(request).toHaveBeenCalledTimes(1);
      expect(client.queryClient.getQueryData(['static-metadata', 'observed'])).toBe('observed');
      expect(client.queryClient.getQueryData(['unrelated'])).toBe('untouched');
      expect(client.queryClient.getQueryState(['static-metadata', 'pending'])?.fetchStatus).toBe(
        'fetching',
      );
      expect(client.queryClient.getQueryCache().getAll()).toHaveLength(
        MAX_RETAINED_STATIC_QUERIES + 3,
      );
      resolve('completed');
      expect(await pending).toBe('completed');
      expect(await duplicate).toBe('completed');
      unsubscribe();
      expect(client.queryClient.getQueryCache().getAll()).toHaveLength(
        MAX_RETAINED_STATIC_QUERIES + 1,
      );
    } finally {
      unsubscribe();
      client.clear();
    }
  });
});

it('caps settled failures together with completed successes', async () => {
  const client = cache();
  for (let id = 0; id < MAX_RETAINED_STATIC_QUERIES + 4; id++) {
    if (id % 2) {
      await expect(
        client.fetch('browse', ['failed', id], async () => {
          throw new Error('offline');
        }),
      ).rejects.toThrow('offline');
    } else await client.fetch('browse', ['success', id], async () => id);
    vi.setSystemTime(Date.now() + 1);
  }
  const retained = client.queryClient.getQueryCache().getAll();
  expect(retained).toHaveLength(MAX_RETAINED_STATIC_QUERIES);
  expect(retained.some((query) => query.state.status === 'error')).toBe(true);
  expect(retained.some((query) => query.state.status === 'success')).toBe(true);
  expect(client.queryClient.getQueryState(['static-metadata', 'failed', 1])).toBeUndefined();
});
