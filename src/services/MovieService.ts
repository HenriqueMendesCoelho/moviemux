import StringUtils from '@/utils/stringUtils';
import axios from 'axios';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_MOVIE = `${BASE_URL}/api/movie`;

export default {
  async getMovie(id: string) {
    return axios.get(`${API_MOVIE}/${id}`);
  },
  async getMovieSummary(id: string) {
    return axios.get(`${API_MOVIE}/tmdb/${id}/summary`);
  },
  async getMoviesByName(payload: { query: string }) {
    const params = StringUtils.getStringParams(payload);
    return axios.get(`${API_MOVIE}/tmdb?${params}`);
  },
  async listMoviesPageable(page: number) {
    return axios.get(`${API_MOVIE}/list?page=${page}&sort=portugueseTitle,cres&size=50`);
  },
  async listMoviesByTitlePageable(payload: { page: number; title: string }) {
    const params = StringUtils.getStringParams(payload);
    return axios.get(`${API_MOVIE}/list?page=${params}&size=50`);
  },
};
