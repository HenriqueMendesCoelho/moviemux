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

/** Swapy slots are positional. Reject incomplete/duplicate maps instead of dropping movies. */
export function orderMoviesBySlots<T extends { tmdb_id: number }>(
  movies: readonly T[],
  map: readonly { slot: string; item: string }[],
): T[] {
  if (map.length !== movies.length) return [...movies];
  const sorted = [...map].sort(
    (a, b) => Number(a.slot.replace('position-', '')) - Number(b.slot.replace('position-', '')),
  );
  if (
    sorted.some((entry, index) => entry.slot !== `position-${index}`) ||
    new Set(sorted.map((entry) => entry.item)).size !== movies.length
  )
    return [...movies];
  const byId = new Map(movies.map((movie) => [String(movie.tmdb_id), movie]));
  const ordered = sorted.map((entry) => byId.get(entry.item));
  return ordered.every((movie): movie is T => movie !== undefined) ? ordered : [...movies];
}
