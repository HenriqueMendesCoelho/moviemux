import { defineStore } from 'pinia';

import Movie from 'src/core/domain/movie/movie';
import { useUserStore } from 'src/core/stores/UserStore';
import type { MovieNoteType } from 'src/core/types/movie/MovieType';

export const useMovieStore = defineStore('MovieStore2', {
  state: () => {
    return {
      moviePage: {
        selectedMovie: new Movie(),
        genres: [] as Array<{ id: number; name: string; tmdb_id: number }>,
        showImportMovieDialog: false,
      },
    };
  },
  getters: {
    isUserAlreadyVoted(): boolean {
      const userStore = useUserStore();
      return !!this.moviePage.selectedMovie.notes?.some((n) => n.user.id === userStore.user.id);
    },
  },
  actions: {
    resetSelectedMovie() {
      this.moviePage.selectedMovie = new Movie();
    },
    selectedMovieHasAnyFieldFilled() {
      let result = false;
      let field: keyof typeof this.moviePage.selectedMovie;
      for (field in this.moviePage.selectedMovie) {
        if (this.moviePage.selectedMovie[field]) {
          result = true;
          continue;
        }
      }
      return result;
    },
    removeNoteFromStore(id: string) {
      const notes = this.moviePage.selectedMovie.notes;
      if (!notes?.length) {
        return;
      }
      const note = notes?.find((n) => n.user.id === id) as MovieNoteType;
      const index = notes?.indexOf(note);
      if (typeof index === 'number') {
        this.moviePage.selectedMovie.notes?.splice(index, 1);
      }
    },
  },
});
