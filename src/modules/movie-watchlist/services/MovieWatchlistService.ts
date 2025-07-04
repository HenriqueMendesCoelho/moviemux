import axios from 'axios';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import StringUtils from 'src/core/utils/StringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_WATCHLIST = `${BASE_URL}/user/wishlist`;

export default {
  async listWatchlists(): Promise<WatchlistType[]> {
    const res = await axios.get(`${API_WATCHLIST}`);

    return res.data;
  },
  async searchWatchlistById(watchlistId: string): Promise<WatchlistType> {
    const res = await axios.get(`${API_WATCHLIST}/${watchlistId}`);

    return res.data;
  },
  async searchWatchlistMoviesRated(watchlistId: string): Promise<{ movie_tmdb_ids: number[] }> {
    const res = await axios.get(`${API_WATCHLIST}/${watchlistId}/movies-rated`);

    return res.data;
  },
  async createWatchlist(watchlistName: string): Promise<WatchlistType> {
    const params = StringUtils.getStringParams({ name: watchlistName });
    const res = await axios.post(`${API_WATCHLIST}`, params);

    return res.data;
  },
  async updateWatchlist(watchlist: WatchlistType): Promise<WatchlistType> {
    const res = await axios.put(`${API_WATCHLIST}/${watchlist.id}/update`, watchlist);

    return res.data;
  },
  async addMovieToWatchlist(watchlistId: string, tmdbId: number): Promise<WatchlistType> {
    const params = StringUtils.getStringParams({ tmdbId });
    const res = await axios.patch(`${API_WATCHLIST}/${watchlistId}`, params);

    return res.data;
  },
  async deleteWatchlist(watchlistId: string): Promise<void> {
    await axios.delete(`${API_WATCHLIST}/${watchlistId}/delete`);
  },
};
