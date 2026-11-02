import { computed, inject, provide, type InjectionKey, type Ref } from 'vue';
import type Movie from 'src/core/domain/movie/movie';
import { useMovieStore } from '../stores/MovieStore';
const movieContextKey: InjectionKey<Ref<Movie>> = Symbol('movie-editor-draft');
export function provideMovieContext(movie: Ref<Movie>) {
  provide(movieContextKey, movie);
}
export function useMovieContext(): Ref<Movie> {
  const movie = inject(movieContextKey, null);
  if (movie) return movie;
  const store = useMovieStore();
  return computed({
    get: () => store.moviePage.selectedMovie,
    set: (value) => {
      store.moviePage.selectedMovie = value;
    },
  });
}
