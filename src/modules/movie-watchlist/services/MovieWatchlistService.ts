import axios from 'axios';
import { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import StringUtils from 'src/core/utils/StringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_WATCHLIST = `${BASE_URL}/user/wishlist`;

export default {
  async listWatchlists(): Promise<WatchlistType[]> {
    try {
      const res = await axios.get(`${API_WATCHLIST}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async searchWatchlistById(watchlistId: string): Promise<WatchlistType> {
    try {
      const res = await axios.get(`${API_WATCHLIST}/${watchlistId}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async searchWatchlistMoviesRated(watchlistId: string): Promise<{ movie_tmdb_ids: number[] }> {
    try {
      const res = await axios.get(`${API_WATCHLIST}/${watchlistId}/movies-rated`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async createWatchlist(watchlistName: string): Promise<WatchlistType> {
    const params = StringUtils.getStringParams({ name: watchlistName });
    try {
      const res = await axios.post(`${API_WATCHLIST}`, params);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async updateWatchlist(watchlist: WatchlistType): Promise<WatchlistType> {
    try {
      const res = await axios.put(`${API_WATCHLIST}/${watchlist.id}/update`, watchlist);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async addMovieToWatchlist(watchlistId: string, tmdbId: number): Promise<WatchlistType> {
    const params = StringUtils.getStringParams({ tmdbId });
    try {
      const res = await axios.patch(`${API_WATCHLIST}/${watchlistId}`, params);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async deleteWatchlist(watchlistId: string): Promise<void> {
    try {
      await axios.delete(`${API_WATCHLIST}/${watchlistId}/delete`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
