/** Keep reorder state detached from the server-confirmed list. */
export function copyWatchlistMovies<T extends { tmdb_id: number }>(movies: readonly T[]): T[] {
  return movies.map((movie) => ({ ...movie }));
}

/** Return a new ordered array; invalid keyboard/drop indices cannot drop a film. */
export function moveWatchlistMovie<T>(movies: readonly T[], from: number, to: number): T[] {
  const result = [...movies];
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= result.length ||
    to >= result.length
  )
    return result;
  const [movie] = result.splice(from, 1);
  result.splice(to, 0, movie as T);
  return result;
}

export type WatchlistOperationScope = { listId: string; accountId: string; generation: number };
export function isCurrentWatchlistOperation(
  start: WatchlistOperationScope,
  current: WatchlistOperationScope,
): boolean {
  return (
    !!start.listId &&
    !!start.accountId &&
    start.listId === current.listId &&
    start.accountId === current.accountId &&
    start.generation === current.generation
  );
}
