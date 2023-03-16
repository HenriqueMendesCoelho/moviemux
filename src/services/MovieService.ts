import StringUtils from '@/utils/stringUtils';
import axios from 'axios';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_MOVIE = `${BASE_URL}/api/movie`;

export default {
  async getMovie(id: string) {
    try {
      const res = await axios.get(`${API_MOVIE}/${id}`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMovieSummary(id: string) {
    try {
      const res = await axios.get(`${API_MOVIE}/tmdb/${id}/summary`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesByName(payload: { query: string }) {
    const params = StringUtils.getStringParams(payload);
    try {
      const res = await axios.get(`${API_MOVIE}/tmdb?${params}`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesGenres(): Promise<Array<{ id: number; name: string }>> {
    try {
      const res = await axios.get(`${API_MOVIE}/genre`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async listMoviesPageable(page: number) {
    try {
      const res = await axios.get(`${API_MOVIE}/list?page=${page}&sort=portugueseTitle,cres&size=50`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async listMoviesByTitlePageable(payload: { page: number; title: string }) {
    const params = StringUtils.getStringParams(payload);
    try {
      const res = await axios.get(`${API_MOVIE}/list?page=${params}&size=50`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
