import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  copyWatchlistMovies,
  moveWatchlistMovie,
  isCurrentWatchlistOperation,
} from '../../src/modules/movie-watchlist/utils/WatchlistDraft';

test('reorder draft never mutates confirmed list, including movie fields', () => {
  const confirmed = [
    { tmdb_id: 1, title: 'One' },
    { tmdb_id: 2, title: 'Two' },
    { tmdb_id: 3, title: 'Three' },
  ];
  const draft = copyWatchlistMovies(confirmed);
  const moved = moveWatchlistMovie(draft, 0, 2);
  moved[0]!.title = 'Edited draft';
  assert.deepEqual(
    confirmed.map((movie) => movie.tmdb_id),
    [1, 2, 3],
  );
  assert.equal(confirmed[1]!.title, 'Two');
  assert.deepEqual(
    moved.map((movie) => movie.tmdb_id),
    [2, 3, 1],
  );
  // Cancel discards draft; sharing the confirmed list still retains original order.
  assert.deepEqual(
    { ...{ id: 'list-a', movies_wishlists: confirmed }, shareable: true }.movies_wishlists.map(
      (movie) => movie.tmdb_id,
    ),
    [1, 2, 3],
  );
});

test('save payload preserves all movie IDs and metadata in the draft order', () => {
  const original = [
    { tmdb_id: 11, title_english: 'A', url_image: '/a.jpg' },
    { tmdb_id: 22, title_english: 'B', url_image: '/b.jpg' },
  ];
  const payload = {
    id: 'list-a',
    shareable: false,
    movies_wishlists: copyWatchlistMovies(moveWatchlistMovie(original, 1, 0)),
  };
  assert.deepEqual(payload.movies_wishlists, [original[1], original[0]]);
  assert.notEqual(payload.movies_wishlists[0], original[1]);
  assert.deepEqual(
    original.map((movie) => movie.tmdb_id),
    [11, 22],
  );
});

test('invalid drag and keyboard indices never remove an entry', () => {
  for (const [from, to] of [
    [-1, 0],
    [0, -1],
    [2, 0],
    [0, 2],
    [0.5, 1],
    [0, NaN],
  ])
    assert.deepEqual(moveWatchlistMovie([1, 2], from!, to!), [1, 2]);
  assert.deepEqual(moveWatchlistMovie([], 0, 0), []);
});

test('late mutation responses are rejected after route, account or generation changes', () => {
  const start = { listId: 'a', accountId: 'user-a', generation: 1 };
  assert.equal(isCurrentWatchlistOperation(start, { ...start }), true);
  assert.equal(isCurrentWatchlistOperation(start, { ...start, listId: 'b' }), false);
  assert.equal(isCurrentWatchlistOperation(start, { ...start, accountId: 'user-b' }), false);
  assert.equal(isCurrentWatchlistOperation(start, { ...start, generation: 2 }), false);
  assert.equal(
    isCurrentWatchlistOperation({ ...start, accountId: '' }, { ...start, accountId: '' }),
    false,
  );
});
