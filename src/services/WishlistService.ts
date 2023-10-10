import axios from 'axios';
import { WishlistType } from 'src/types/wishlist/WishlistType';
import StringUtils from 'src/utils/stringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_WISHLIST = `${BASE_URL}/api/user/wishlist`;

export default {
  async listWishlists(): Promise<WishlistType[]> {
    try {
      const res = await axios.get(`${API_WISHLIST}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async searchWishlistById(wishlistId: string): Promise<WishlistType> {
    try {
      const res = await axios.get(`${API_WISHLIST}/${wishlistId}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async searchWishlistMoviesRated(wishlistId: string): Promise<{ movie_tmdb_ids: number[] }> {
    try {
      const res = await axios.get(`${API_WISHLIST}/${wishlistId}/movies-rated`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async createWishlist(wishlistName: string): Promise<WishlistType> {
    const params = StringUtils.getStringParams({ name: wishlistName });
    try {
      const res = await axios.post(`${API_WISHLIST}`, params);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async updateWishlist(wishlist: WishlistType): Promise<WishlistType> {
    try {
      const res = await axios.put(`${API_WISHLIST}/${wishlist.id}/update`, wishlist);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async addMovieToWishlist(wishlistId: string, tmdbId: number): Promise<WishlistType> {
    const params = StringUtils.getStringParams({ tmdbId });
    try {
      const res = await axios.patch(`${API_WISHLIST}/${wishlistId}`, params);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async deleteWishlist(wishlistId: string): Promise<void> {
    try {
      await axios.delete(`${API_WISHLIST}/${wishlistId}/delete`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
