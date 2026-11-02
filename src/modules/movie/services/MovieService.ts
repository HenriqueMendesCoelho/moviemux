import axios from 'src/core/http';
import StringUtils from 'src/core/utils/StringUtils';
import type {
  MovieResultResponseTmdb,
  MovieNoteType,
  MoviePageableType,
  MovieRequestType,
  MovieSummaryTypeKit,
} from 'src/core/types/movie/MovieType';
import type Movie from 'src/core/domain/movie/movie';

const BASE_URL = '';
const API_MOVIE = `${BASE_URL}/movie`;

/** Spring uses one-indexed request parameters and zero-indexed response metadata. */
function emptyMoviePage(page: number, size: number): MoviePageableType {
  const number = Math.max(0, page - 1);
  const sort = { empty: false, sorted: true, unsorted: false };
  return {
    content: [],
    pageable: {
      sort,
      offset: number * size,
      page_number: number,
      page_size: size,
      unpaged: false,
      paged: true,
    },
    last: true,
    total_elements: 0,
    total_pages: 0,
    size,
    number,
    sort,
    number_of_elements: 0,
    first: number === 0,
    empty: true,
  };
}

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
    const res = await axios.get<Movie>(`${API_MOVIE}/${movieId}`);
    if (res.status === 204 || !res.data) throw new Error('Movie not found');
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

    const res = await axios.get<MoviePageableType>(`${API_MOVIE}${queryParams}`);
    return res.status === 204 ? emptyMoviePage(page, size) : res.data;
  },
  async createMovie(payload: MovieRequestType): Promise<Movie> {
    const res = await axios.post(`${API_MOVIE}`, payload);
    return res.data;
  },
  async updateMovie(payload: MovieRequestType): Promise<Movie> {
    const res = await axios.put(`${API_MOVIE}/${payload.id}/update`, payload);
    return res.data;
  },
  async deleteMovie(movieId: string): Promise<void> {
    await axios.delete(`${API_MOVIE}/${movieId}/delete`);
  },

  //Genres
  async getMoviesGenres(): Promise<Array<{ id: number; name: string; tmdb_id: number }>> {
    const res = await axios.get<Array<{ id: number; name: string; tmdb_id: number }>>(
      `${API_MOVIE}/genres`,
    );
    return res.status === 204 ? [] : res.data;
  },
  async getMoviesGenresWithMovies(): Promise<Array<{ id: number; name: string; tmdb_id: number }>> {
    const res = await axios.get<Array<{ id: number; name: string; tmdb_id: number }>>(
      `${API_MOVIE}/genres-with-movies`,
    );
    return res.status === 204 ? [] : res.data;
  },

  //Movie Notes
  async createMovieNote(note: number, movieId?: string | Array<string>): Promise<MovieNoteType> {
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
  async updateMovieNotes(note: number, movieId?: string | Array<string>): Promise<MovieNoteType> {
    if (!movieId) {
      throw new Error('Movie ID is required to update notes');
    }

    const res = await axios.patch(`${API_MOVIE}/note/${movieId.toString()}/update`, { note });
    return res.data;
  },
  async deleteMovieNotes(movieId?: string | Array<string>): Promise<void> {
    if (!movieId) {
      throw new Error('Movie ID is required to delete notes');
    }

    await axios.delete(`${API_MOVIE}/note/${movieId.toString()}/delete`);
  },
};
