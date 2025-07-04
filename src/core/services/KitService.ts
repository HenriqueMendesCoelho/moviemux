import type {
  Credits,
  MovieInfoTypeKit,
  MovieResultResponseTmdb,
  MovieSummaryTypeKit,
  MovieWatchProvider,
} from 'src/core/types/movie/MovieType';
import axios from 'axios';
import StringUtils from 'src/core/utils/StringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_KIT = `${BASE_URL}/movie/tmdb`;
const API_KIT_PUBLIC = `${BASE_URL}/public/movie/tmdb`;

export default {
  async summary(payload: { tmdb_id: number }): Promise<MovieSummaryTypeKit> {
    const res = await axios.get(`${API_KIT}/${payload.tmdb_id}/summary`);

    return res.data;
  },
  async info(payload: { tmdb_id: number }): Promise<MovieInfoTypeKit> {
    const res = await axios.get(`${API_KIT_PUBLIC}/${payload.tmdb_id}/info`);

    return res.data;
  },
  async searchByName(payload: {
    query: string;
    page?: number;
    language?: 'pt-Br';
  }): Promise<MovieResultResponseTmdb> {
    payload.page = payload.page || 1;
    const params = StringUtils.getStringParams(payload);
    const res = await axios.get(`${API_KIT}?${params}`);

    return res.data;
  },
  async getMoviesPopular(page = 1): Promise<MovieResultResponseTmdb> {
    const res = await axios.get(`${API_KIT}/popular?page=${page}`);

    return res.data;
  },
  async getMoviesNowPlaying(page = 1): Promise<MovieResultResponseTmdb> {
    const res = await axios.get(`${API_KIT}/now-playing?page=${page}`);

    return res.data;
  },
  async getMoviesUpcoming(page = 1): Promise<MovieResultResponseTmdb> {
    const res = await axios.get(`${API_KIT}/upcoming?page=${page}`);

    return res.data;
  },
  async getMoviesTopRated(page = 1): Promise<MovieResultResponseTmdb> {
    const res = await axios.get(`${API_KIT}/top-rated?page=${page}`);

    return res.data;
  },
  async getMoviesRecommendations(movieId: number, page = 1): Promise<MovieResultResponseTmdb> {
    const res = await axios.get(`${API_KIT}/${movieId}/recommendations?page=${page}`);

    return res.data;
  },
  async getMoviesSimilar(movieId: number, page = 1): Promise<MovieResultResponseTmdb> {
    const res = await axios.get(`${API_KIT}/${movieId}/similar?page=${page}`);

    return res.data;
  },
  async getMoviesDiscover(
    sort?: string,
    page = 1,
    year?: number,
    with_genres?: string,
  ): Promise<MovieResultResponseTmdb> {
    const params = getStringParams(discoverParams(sort, page, year, with_genres));
    const res = await axios.get(`${API_KIT}/discover?${params}`);

    return res.data;
  },
  async getWatchProviders(tmdb_id: number): Promise<MovieWatchProvider> {
    const res = await axios.get(`${API_KIT}/${tmdb_id}/watch-providers`);

    return res.data;
  },
  async getMovieCredits(tmdb_id: number): Promise<Credits> {
    const res = await axios.get(`${API_KIT}/${tmdb_id}/credits`);

    return res.data;
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
