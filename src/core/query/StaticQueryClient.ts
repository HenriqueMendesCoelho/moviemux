import { QueryClient, CancelledError, type QueryKey } from '@tanstack/vue-query';

export const staticQueryPolicies = {
  browse: { staleTime: 5 * 60_000, gcTime: 20 * 60_000 },
  detail: { staleTime: 30 * 60_000, gcTime: 60 * 60_000 },
  providers: { staleTime: 15 * 60_000, gcTime: 30 * 60_000 },
  genres: { staleTime: 6 * 60 * 60_000, gcTime: 6 * 60 * 60_000 },
} as const;
/** Count cap, not a byte limit. Active/in-flight queries are never evicted to meet it. */
export const MAX_RETAINED_STATIC_QUERIES = 128;
export type StaticQueryKind = keyof typeof staticQueryPolicies;

/** One instance per browser app, never a module singleton or SSR payload. */
export function createStaticQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false },
    },
  });
  const queries = queryClient.getQueryCache();
  let pruning = false;
  function pruneCompleted() {
    if (pruning) return;
    pruning = true;
    try {
      const retained = queries
        .getAll()
        .filter(
          (query) =>
            query.queryKey[0] === 'static-metadata' &&
            query.getObserversCount() === 0 &&
            query.state.fetchStatus === 'idle' &&
            query.state.status !== 'pending',
        )
        .sort(
          (a, b) =>
            Math.max(a.state.dataUpdatedAt, a.state.errorUpdatedAt) -
            Math.max(b.state.dataUpdatedAt, b.state.errorUpdatedAt),
        );
      // Stable sort preserves insertion order for responses completed in the same millisecond.
      for (const query of retained.slice(
        0,
        Math.max(0, retained.length - MAX_RETAINED_STATIC_QUERIES),
      )) {
        queries.remove(query);
      }
    } finally {
      pruning = false;
    }
  }
  queries.subscribe((event) => {
    if (event.type === 'updated' || event.type === 'observerRemoved') pruneCompleted();
  });
  let epoch = 0;
  return {
    queryClient,
    clear() {
      epoch++;
      // Query removal cancels in-flight queries, including their consumed AbortSignal.
      queryClient.clear();
    },
    async fetch<T>(
      kind: StaticQueryKind,
      key: QueryKey,
      request: (signal: AbortSignal) => Promise<T>,
    ): Promise<T> {
      const started = epoch;
      const result = await queryClient.fetchQuery({
        queryKey: ['static-metadata', ...key],
        ...staticQueryPolicies[kind],
        queryFn: async ({ signal }) => {
          const value = await request(signal);
          if (started !== epoch || signal.aborted) throw new CancelledError();
          return value;
        },
      });
      if (started !== epoch) throw new CancelledError();
      // Editing/importing metadata must never mutate the cached source shared by other consumers.
      return structuredClone(result);
    },
  };
}
export type StaticQueryCache = ReturnType<typeof createStaticQueryClient>;
