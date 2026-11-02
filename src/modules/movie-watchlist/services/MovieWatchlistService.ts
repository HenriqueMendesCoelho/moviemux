import axios from 'src/core/http';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import StringUtils from 'src/core/utils/StringUtils';

const BASE_URL = '';
const API_WATCHLIST = `${BASE_URL}/user/wishlist`;

// The API omits null properties (NON_NULL); an empty wishlist has no movies_wishlists.
type WatchlistResponse = Omit<WatchlistType, 'movies_wishlists'> & {
  movies_wishlists?: WatchlistType['movies_wishlists'] | null;
};

function normalizeWatchlist(value: WatchlistResponse | null | undefined): WatchlistType {
  // A 204/missing entity is not an empty list: let callers show their existing error state.
  if (!value || typeof value.id !== 'string' || !value.id) {
    throw new Error('A lista de filmes não foi encontrada.');
  }
  return { ...value, movies_wishlists: value.movies_wishlists ?? [] };
}

export default {
  async listWatchlists(): Promise<WatchlistType[]> {
    const res = await axios.get<WatchlistResponse[] | null>(`${API_WATCHLIST}`);

    return res.status === 204 ? [] : (res.data ?? []).map(normalizeWatchlist);
  },
  async searchWatchlistById(watchlistId: string): Promise<WatchlistType> {
    const res = await axios.get<WatchlistResponse | null>(`${API_WATCHLIST}/${watchlistId}`);

    return normalizeWatchlist(res.data);
  },
  async searchWatchlistMoviesRated(watchlistId: string): Promise<{ movie_tmdb_ids: number[] }> {
    const res = await axios.get(`${API_WATCHLIST}/${watchlistId}/movies-rated`);

    return res.data;
  },
  async createWatchlist(watchlistName: string): Promise<WatchlistType> {
    const params = StringUtils.getStringParams({ name: watchlistName });
    const res = await axios.post<WatchlistResponse | null>(`${API_WATCHLIST}`, params);

    return normalizeWatchlist(res.data);
  },
  async updateWatchlist(watchlist: WatchlistType): Promise<WatchlistType> {
    const res = await axios.put<WatchlistResponse | null>(
      `${API_WATCHLIST}/${watchlist.id}/update`,
      watchlist,
    );

    return normalizeWatchlist(res.data);
  },
  async addMovieToWatchlist(watchlistId: string, tmdbId: number): Promise<WatchlistType> {
    const params = StringUtils.getStringParams({ tmdbId });
    const res = await axios.patch<WatchlistResponse | null>(
      `${API_WATCHLIST}/${watchlistId}`,
      params,
    );

    return normalizeWatchlist(res.data);
  },
  async deleteWatchlist(watchlistId: string): Promise<void> {
    await axios.delete(`${API_WATCHLIST}/${watchlistId}/delete`);
  },
};
