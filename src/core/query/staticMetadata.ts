import { useNuxtApp } from '#app';
import axios from 'src/core/http';
import type { StaticQueryCache, StaticQueryKind } from './StaticQueryClient';

/** Resolve the current app synchronously; no module-global session, token or cache. */
export function staticMetadata<T>(
  kind: StaticQueryKind,
  path: string,
  dimensions: Record<string, unknown> = {},
): Promise<T> {
  const app = useNuxtApp() as unknown as { $staticQuery?: StaticQueryCache };
  const get = axios.get.bind(axios);
  const request = async (signal?: AbortSignal): Promise<T> => {
    const response = await get<T>(path, { signal });
    if (response.status === 204 && kind === 'genres') return [] as T;
    return response.data;
  };
  // Client-only plugin: SSR always executes its own request and never dehydrates metadata.
  if (import.meta.server || !app.$staticQuery) return request();
  return app.$staticQuery.fetch(kind, [path, dimensions], request);
}
