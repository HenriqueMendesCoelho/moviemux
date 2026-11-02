import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  cloneMovie,
  fullReleaseDate,
  dateOnly,
  sortNotes,
  validRating,
  mergeReview,
  tmdbImageUrl,
  hasMovieFields,
} from '../MovieStateUtils';
import { createRequestGate } from '../RequestGate';

test('editor nested changes never mutate the canonical movie', () => {
  const original = {
    id: 'a',
    portuguese_title: 'Original',
    genres: [{ id: 1, name: 'Drama' }],
    notes: [
      {
        note: 7,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        user: { id: 'u1', name: 'Ana' },
      },
    ],
    release_date: new Date('2026-01-01'),
  };
  const draft = cloneMovie(original);
  draft.portuguese_title = 'Draft';
  draft.genres![0]!.name = 'Changed';
  draft.notes![0]!.user.name = 'Changed';
  draft.release_date!.setFullYear(2000);
  assert.equal(original.portuguese_title, 'Original');
  assert.equal(original.genres[0]!.name, 'Drama');
  assert.equal(original.notes[0]!.user.name, 'Ana');
  assert.equal(original.release_date.getUTCFullYear(), 2026);
});
test('discarding a draft needs no canonical-state rollback', () => {
  const original = { id: 'a', portuguese_title: 'Original' };
  let draft = cloneMovie(original);
  draft.portuguese_title = 'Unsaved';
  draft = cloneMovie(original);
  assert.equal(draft.portuguese_title, 'Original');
  assert.equal(original.portuguese_title, 'Original');
});
test('full release date is stable for UTC January 1 and invalid/empty dates', () => {
  assert.equal(fullReleaseDate('2026-01-01T00:00:00Z'), '01/01/2026');
  assert.equal(fullReleaseDate(new Date('2026-01-01T00:00:00Z')), '01/01/2026');
  assert.equal(fullReleaseDate(), 'Data não informada');
  assert.equal(dateOnly(new Date('invalid')), '');
});
test('rating zero is valid, blank/coerced strings/nonfinite/fractional values are not', () => {
  for (const value of [0, 1, 10]) assert.equal(validRating(value), true);
  for (const value of ['', '0', null, NaN, Infinity, -1, 11, 5.5])
    assert.equal(validRating(value), false);
});
test('review events replace once and deletion removes only that author', () => {
  const a = {
    note: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'a', name: 'Ana' },
  };
  const b = { ...a, user: { id: 'b', name: 'Bruno' } };
  const twice = mergeReview(mergeReview([b], a), a);
  assert.equal(twice.length, 2);
  assert.equal(twice.find((note) => note.user.id === 'a')!.note, 0);
  assert.deepEqual(mergeReview(twice, a, true), [b]);
});
test('review sorting supports descending names and snake/camel timestamps', () => {
  const a = {
    note: 8,
    createdAt: new Date(),
    updatedAt: new Date('2026-01-01'),
    user: { id: 'a', name: 'Ana' },
  };
  const b = {
    note: 6,
    createdAt: new Date(),
    updated_at: '2026-02-01',
    user: { id: 'b', name: 'Bruno' },
  };
  assert.equal(sortNotes([a, b], 'name-desc')[0]!.user.id, 'b');
  assert.equal(sortNotes([a, b], 'updated')[0]!.user.id, 'b');
  assert.equal(sortNotes([a, b], 'note')[0]!.user.id, 'a');
});
test('TMDB images honor configured base and absolute source URLs', () => {
  assert.equal(
    tmdbImageUrl('https://cdn.test/images/', '/poster.jpg'),
    'https://cdn.test/images/w342/poster.jpg',
  );
  assert.equal(
    tmdbImageUrl('https://cdn.test', 'https://other.test/image.jpg'),
    'https://other.test/image.jpg',
  );
  assert.equal(tmdbImageUrl('https://cdn.test'), '');
});
test('runtime zero counts as populated data but empty arrays do not', () => {
  assert.equal(hasMovieFields({ runtime: 0 }), true);
  assert.equal(hasMovieFields({ genres: [], notes: [] }), false);
});
test('latest request wins in one channel, with independent channels retained', () => {
  const gate = createRequestGate(() => 'account-a:/movie/1');
  const first = gate.begin('load');
  const independent = gate.begin('genres');
  const second = gate.begin('load');
  assert.equal(first(), false);
  assert.equal(second(), true);
  assert.equal(independent(), true);
});
test('route and account changes invalidate both success and failure side effects', async () => {
  let context = 'a:/movie/1';
  const gate = createRequestGate(() => context);
  const current = gate.begin();
  const effects: string[] = [];
  const pending = Promise.resolve()
    .then(() => {
      if (current()) effects.push('success');
    })
    .catch(() => {
      if (current()) effects.push('error');
    });
  context = 'b:/movie/2';
  await pending;
  assert.deepEqual(effects, []);
  assert.equal(current(), false);
});
test('rejected requests cannot emit errors after a route/account switch', async () => {
  let context = 'a:/movie/1';
  const gate = createRequestGate(() => context);
  const current = gate.begin();
  let errorShown = false;
  const pending = Promise.reject(new Error('backend')).catch(() => {
    if (current()) errorShown = true;
  });
  context = 'b:/movie/1';
  await pending;
  assert.equal(errorShown, false);
});
test('resetting the same route and account invalidates existing dialog tickets', () => {
  const gate = createRequestGate(() => 'same');
  const confirm = gate.begin('confirm');
  gate.invalidate();
  assert.equal(confirm(), false);
  assert.equal(gate.begin()(), true);
});
test('disposing invalidates pending operations permanently', () => {
  const gate = createRequestGate(() => 'same');
  const current = gate.begin();
  gate.dispose();
  assert.equal(current(), false);
  assert.equal(gate.begin()(), false);
});

test('backend hidden and null ratings remain last behind real zero without fabricated timestamps', () => {
  const hidden = { user: { id: 'hidden', name: 'Hidden' }, created_at: '2026-11-02T03:00:00Z' };
  const nullScore = { user: { id: 'null', name: 'Null' }, note: null };
  const zero = { user: { id: 'zero', name: 'Zero' }, note: 0, updated_at: '2026-11-02T04:00:00Z' };
  assert.deepEqual(
    sortNotes([hidden, nullScore, zero], 'note').map((note) => note.user.id),
    ['zero', 'hidden', 'null'],
  );
  assert.equal(sortNotes([hidden, zero], 'updated')[0]!.user.id, 'zero');
});
test('responsive TMDB posters provide width candidates without rewriting external URLs', async () => {
  const { tmdbPosterSrcset } = await import('../MovieStateUtils');
  const relative = tmdbPosterSrcset('https://cdn.example/t/p/', '/poster.jpg');
  assert.ok(relative?.includes('https://cdn.example/t/p/w500/poster.jpg 500w'));
  assert.ok(relative?.includes('w780/poster.jpg 780w'));
  assert.ok(!relative?.includes('original'));
  assert.equal(
    tmdbPosterSrcset('https://cdn.example/t/p', 'https://other.example/poster.jpg'),
    undefined,
  );
  assert.equal(
    tmdbPosterSrcset('https://cdn.example/t/p', 'https://cdn.example/t/p/w342/poster.jpg'),
    relative,
  );
  assert.ok(
    tmdbPosterSrcset(
      'https://cdn.example/t/p',
      'https://image.tmdb.org/t/p/w500/poster.jpg',
    )?.includes('https://image.tmdb.org/t/p/w780/poster.jpg 780w'),
  );
  assert.equal(tmdbPosterSrcset('https://cdn.example/t/p'), undefined);
});
