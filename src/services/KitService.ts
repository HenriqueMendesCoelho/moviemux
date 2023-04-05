import { MovieFoundByName, MovieSummaryTypeKit } from '@/types/movie/MovieType';
import axios from 'axios';
import StringUtils from '@/utils/stringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_KIT = `${BASE_URL}/api/movie/tmdb`;

export default {
  async summary(payload: { tmdb_id: number }): Promise<MovieSummaryTypeKit> {
    try {
      const res = await axios.get(`${API_KIT}/${payload.tmdb_id}/summary`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async searchByName(payload: { query: string; page?: 1 | number; language?: 'pt-Br' }): Promise<MovieFoundByName> {
    const params = StringUtils.getStringParams(payload);

    try {
      const res = await axios.get(`${API_KIT}?${params}`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
