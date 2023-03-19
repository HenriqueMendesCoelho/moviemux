import Movie from '@/domain/movie/movie';

export type MovieSummaryTypeKit = {
  tmdb_id?: number;
  imdb_id?: string;
  portuguese_title?: string;
  english_title?: string;
  original_title?: string;
  director?: string;
  url_image_portuguese?: string;
  url_image_english?: string;
  portuguese_url_trailer?: string;
  english_url_trailer?: string;
  description?: string;
  genres?: Array<string>;
  release_date?: Date;
};

export type MovieFoundByName = {
  page: number;
  results: Array<{
    adult: boolean;
    backdrop_path: string;
    genre_ids: Array<number>;
    id: number;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: string;
    poster_path: string;
    release_date: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
  }>;
  total_pages: number;
  total_results: number;
};

export type MovieNoteType = {
  note: number;
  createdAt: Date;
  updatedAt: Date;
  user: UserMovieNoteType;
};

export type UserMovieNoteType = {
  id: string;
  name: string;
};

export type MovieRequestType = {
  id?: string;
  tmdb_id?: number;
  imdbId?: string;
  portuguese_title?: string;
  english_title?: string;
  original_title?: string;
  director?: string;
  url_image?: string;
  portuguese_url_trailer?: string;
  english_url_trailer?: string;
  description?: string;
  genres?: number[];
  release_date?: Date;
  notes?: MovieNoteType[];
};

export type MoviePageableType = {
  content: Movie[];
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    page_number: number;
    page_size: number;
    unpaged: boolean;
    paged: boolean;
  };
  last: boolean;
  total_elements: boolean;
  total_pages: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  number_of_elements: boolean;
  first: boolean;
  empty: boolean;
};
