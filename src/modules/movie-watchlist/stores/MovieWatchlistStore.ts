import { defineStore } from 'pinia';
import MovieWatchlistService from '../services/MovieWatchlistService';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import { showError } from 'src/core/utils/NotificationUtils';

export const useMovieWatchlistStore = defineStore('MovieWatchlistStore', {
  state: () => {
    return {
      watchlists: [] as WatchlistType[],
      selectedWatchlist: undefined as WatchlistType | undefined,
    };
  },
  actions: {
    async getWatchlists() {
      try {
        this.watchlists = await MovieWatchlistService.listWatchlists();
      } catch {
        showError('Erro ao buscar listas de filmes');
      }
    },
  },
});
