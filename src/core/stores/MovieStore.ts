import { defineStore } from 'pinia';

import Movie from 'src/domain/movie/movie';
import { useUserStore } from './UserStore';
import { MovieNoteType } from 'src/core/types/movie/MovieType';

export const useMovieStore = defineStore('MovieStore', {
  state: () => {
    return {
      moviePage: {
        isEditing: false,
        selectedMovie: new Movie(),
        showImportMovieDialog: false,
        genres: [] as Array<{ id: number; name: string; tmdb_id: number }>,
      },
    };
  },
  getters: {
    isUserAlreadyVoted(): boolean {
      const userStore = useUserStore();
      return this.moviePage.selectedMovie.notes?.some((n) => n.user.id === userStore.user.id) ? true : false;
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
