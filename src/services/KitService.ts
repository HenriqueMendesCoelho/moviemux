import {
  Credits,
  MovieInfoTypeKit,
  MovieResultResponseTmdb,
  MovieSummaryTypeKit,
  MovieWatchProvider,
} from 'src/core/types/movie/MovieType';
import axios from 'axios';
import StringUtils from 'src/utils/StringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_KIT = `${BASE_URL}/movie/tmdb`;
const API_KIT_PUBLIC = `${BASE_URL}/public/movie/tmdb`;

export default {
  async summary(payload: { tmdb_id: number }): Promise<MovieSummaryTypeKit> {
    try {
      const res = await axios.get(`${API_KIT}/${payload.tmdb_id}/summary`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async info(payload: { tmdb_id: number }): Promise<MovieInfoTypeKit> {
    try {
      const res = await axios.get(`${API_KIT_PUBLIC}/${payload.tmdb_id}/info`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async searchByName(payload: { query: string; page?: 1 | number; language?: 'pt-Br' }): Promise<MovieResultResponseTmdb> {
    const params = StringUtils.getStringParams(payload);

    try {
      const res = await axios.get(`${API_KIT}?${params}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesPopular(page = 1): Promise<MovieResultResponseTmdb> {
    try {
      const res = await axios.get(`${API_KIT}/popular?page=${page}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesNowPlaying(page = 1): Promise<MovieResultResponseTmdb> {
    try {
      const res = await axios.get(`${API_KIT}/now-playing?page=${page}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesUpcoming(page = 1): Promise<MovieResultResponseTmdb> {
    try {
      const res = await axios.get(`${API_KIT}/upcoming?page=${page}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesTopRated(page = 1): Promise<MovieResultResponseTmdb> {
    try {
      const res = await axios.get(`${API_KIT}/top-rated?page=${page}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesRecommendations(movieId: number, page = 1): Promise<MovieResultResponseTmdb> {
    try {
      const res = await axios.get(`${API_KIT}/${movieId}/recommendations?page=${page}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesSimilar(movieId: number, page = 1): Promise<MovieResultResponseTmdb> {
    try {
      const res = await axios.get(`${API_KIT}/${movieId}/similar?page=${page}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMoviesDiscover(sort?: string, page = 1, year?: number, with_genres?: string): Promise<MovieResultResponseTmdb> {
    const params = getStringParams(discoverParams(sort, page, year, with_genres));
    try {
      const res = await axios.get(`${API_KIT}/discover?${params}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getWatchProviders(tmdb_id: number): Promise<MovieWatchProvider> {
    try {
      const res = await axios.get(`${API_KIT}/${tmdb_id}/watch-providers`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getMovieCredits(tmdb_id: number): Promise<Credits> {
    try {
      const res = await axios.get(`${API_KIT}/${tmdb_id}/credits`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
};

// eslint-disable-next-line
function getStringParams(params: any) {
  return new URLSearchParams(params).toString();
}

function discoverParams(sort?: string, page?: number, year?: number, with_genres?: string) {
  // eslint-disable-next-line
  let result: any = {};
  if (sort) {
    result.sort = sort;
  }
  if (page) {
    result.page = page;
  }
  if (year) {
    result.year = year;
  }
  if (with_genres) {
    result.with_genres = with_genres;
  }

  return result;
}
