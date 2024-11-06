import { defineStore } from 'pinia';
import WishlistService from 'src/core/services/WishlistService';
import { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistTyoe';
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
        this.watchlists = await WishlistService.listWishlists();
      } catch {
        showError('Erro ao buscar listas de filmes');
      }
    },
  },
});
