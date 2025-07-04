import axios from 'axios';
import StringUtils from 'src/core/utils/StringUtils';
import type {
  MovieResultResponseTmdb,
  MovieNoteType,
  MoviePageableType,
  MovieRequestType,
  MovieSummaryTypeKit,
} from 'src/core/types/movie/MovieType';
import type Movie from 'src/core/domain/movie/movie';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_MOVIE = `${BASE_URL}/movie`;

export default {
  //Movie TMDB
  async getMovieSummary(movieIdTmdb: string): Promise<MovieSummaryTypeKit> {
    const res = await axios.get(`${API_MOVIE}/tmdb/${movieIdTmdb}/summary`);
    return res.data;
  },
  async getMoviesByName(payload: { query: string }): Promise<MovieResultResponseTmdb> {
    const params = StringUtils.getStringParams(payload);
    const res = await axios.get(`${API_MOVIE}/tmdb?${params}`);
    return res.data;
  },

  //Movie Cine
  async getMovie(movieId: string): Promise<Movie> {
    const res = await axios.get(`${API_MOVIE}/${movieId}`);
    return res.data;
  },
  async listMoviesPageable({
    title,
    sort,
    page = 1,
    size = 30,
    withGenres,
  }: {
    title?: string;
    sort?: string;
    page?: number;
    size?: number;
    withGenres?: string;
  }): Promise<MoviePageableType> {
    let queryParams = `?sort=${sort || 'portugueseTitle,asc'}`;
    queryParams += title ? `&title=${encodeURIComponent(title)}` : '';
    queryParams += page ? `&page=${page}` : '';
    queryParams += size ? `&size=${size}` : '';
    queryParams += withGenres ? `&withGenres=${withGenres}` : '';

    const res = await axios.get(`${API_MOVIE}${queryParams}`);
    return res.data;
  },
  async createMovie(payload: MovieRequestType): Promise<Movie> {
    const res = await axios.post(`${API_MOVIE}`, payload);
    return res.data;
  },
  async updateMovie(payload: MovieRequestType): Promise<Movie> {
    const res = await axios.put(`${API_MOVIE}/${payload.id}/update`, payload);
    return res.data;
  },
  async deleteMovie(movieId: string): Promise<Movie> {
    const res = await axios.delete(`${API_MOVIE}/${movieId}/delete`);
    return res.data;
  },

  //Genres
  async getMoviesGenres(): Promise<Array<{ id: number; name: string; tmdb_id: number }>> {
    const res = await axios.get(`${API_MOVIE}/genres`);
    return res.data;
  },
  async getMoviesGenresWithMovies(): Promise<Array<{ id: number; name: string; tmdb_id: number }>> {
    const res = await axios.get(`${API_MOVIE}/genres-with-movies`);
    return res.data;
  },

  //Movie Notes
  async createMovieNote(note: number, movieId?: string | Array<string>) {
    const res = await axios.post(`${API_MOVIE}/note`, { movie_id: movieId, note });
    return res.data;
  },
  async getMovieNotes(movieId?: string | Array<string>): Promise<Array<MovieNoteType>> {
    if (!movieId) {
      throw new Error('Movie ID is required to get notes');
    }

    const res = await axios.get(`${API_MOVIE}/note/${movieId.toString()}`);
    return res.data;
  },
  async updateMovieNotes(
    note: number,
    movieId?: string | Array<string>,
  ): Promise<Array<MovieNoteType>> {
    if (!movieId) {
      throw new Error('Movie ID is required to update notes');
    }

    const res = await axios.patch(`${API_MOVIE}/note/${movieId.toString()}/update`, { note });
    return res.data;
  },
  async deleteMovieNotes(movieId?: string | Array<string>): Promise<Array<MovieNoteType>> {
    if (!movieId) {
      throw new Error('Movie ID is required to delete notes');
    }

    const res = await axios.delete(`${API_MOVIE}/note/${movieId.toString()}/delete`);
    return res.data;
  },
};
