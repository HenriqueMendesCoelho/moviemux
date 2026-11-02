import { defineStore } from 'pinia';
import { useUserStore } from 'src/core/stores/UserStore';
const requests = new WeakMap<object, number>();
import MovieWatchlistService from '../services/MovieWatchlistService';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import { showError } from 'src/core/utils/NotificationUtils';

export const useMovieWatchlistStore = defineStore('MovieWatchlistStore', {
  state: () => {
    return {
      watchlists: [] as WatchlistType[],
      pendingMembership: {} as Record<string, boolean>,
      selectedWatchlist: undefined as WatchlistType | undefined,
    };
  },
  actions: {
    async addMovie(watchlistId: string, tmdbId: number) {
      const user = useUserStore();
      const account = user.user.id;
      const session = user.user;
      const target = this.watchlists.find(
        (list) => list.id === watchlistId && list.user.id === account,
      );
      if (
        !user.user.isLoged ||
        !target ||
        this.pendingMembership[watchlistId] ||
        target.movies_wishlists.some((movie) => movie.tmdb_id === tmdbId)
      )
        return false;
      this.pendingMembership[watchlistId] = true;
      const current = () => user.user === session && user.user.id === account && user.user.isLoged;
      try {
        const result = await MovieWatchlistService.addMovieToWatchlist(watchlistId, tmdbId);
        if (!current()) return false;
        const index = this.watchlists.findIndex(
          (list) => list.id === watchlistId && list.user.id === account,
        );
        if (index !== -1) this.watchlists[index] = result;
        return true;
      } finally {
        if (current()) delete this.pendingMembership[watchlistId];
      }
    },
    async getWatchlists() {
      const user = useUserStore();
      const account = user.user.id;
      const session = user.user;
      const version = (requests.get(this) || 0) + 1;
      requests.set(this, version);
      const current = () =>
        requests.get(this) === version &&
        user.user === session &&
        user.user.isLoged &&
        user.user.id === account;
      if (!user.user.isLoged) {
        this.watchlists = [];
        return false;
      }
      try {
        const result = await MovieWatchlistService.listWatchlists();
        if (!current()) return false;
        this.watchlists = result;
        return true;
      } catch {
        if (current()) showError('Erro ao buscar listas de filmes');
        return false;
      }
    },
  },
});
