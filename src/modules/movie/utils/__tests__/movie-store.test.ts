import { beforeEach, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { toRaw } from 'vue';
import { useMovieStore } from '../../stores/MovieStore';
beforeEach(() => setActivePinia(createPinia()));
test('initial and reset movie state are plain objects safe for Nuxt SSR serialization', () => {
  const store = useMovieStore();
  expect(Object.getPrototypeOf(toRaw(store.moviePage.selectedMovie))).toBe(Object.prototype);
  store.moviePage.selectedMovie = { id: 'a' };
  store.resetSelectedMovie();
  expect(Object.getPrototypeOf(toRaw(store.moviePage.selectedMovie))).toBe(Object.prototype);
  expect(store.moviePage.selectedMovie.id).toBeUndefined();
});
