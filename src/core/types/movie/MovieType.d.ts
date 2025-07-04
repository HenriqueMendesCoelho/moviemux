import type Movie from 'src/core/domain/movie/movie';

export type MovieSummaryTypeKit = {
  tmdb_id: number;
  imdb_id: string;
  portuguese_title: string;
  english_title: string;
  original_title: string;
  director: string;
  url_image_portuguese: string;
  url_image_english: string;
  portuguese_url_trailer: string;
  english_url_trailer: string;
  description: string;
  genres: Array<string>;
  release_date: Date;
  runtime: number;
};

export type MovieInfoTypeKit = {
  title: string;
  url_image: string;
  description: string;
};

export type MovieResultResponseTmdb = {
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
  id?: string | undefined;
  tmdb_id?: number | undefined;
  imdbId?: string | undefined;
  portuguese_title?: string | undefined;
  english_title?: string | undefined;
  original_title?: string | undefined;
  director?: string | undefined;
  url_image?: string | undefined;
  portuguese_url_trailer?: string | undefined;
  english_url_trailer?: string | undefined;
  description?: string | undefined;
  genres?: number[] | undefined;
  release_date?: Date | undefined;
  notes?: MovieNoteType[] | undefined;
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
  total_elements: number;
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

export type MovieWatchProvider = {
  id: number;
  results: {
    [key: string]: {
      link: string;
      flatrate?: Provider[];
      rent?: Provider[];
      buy?: Provider[];
    };
  };
};

type Provider = {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
};

export type CastMember = {
  known_for_department: string;
  name: string;
  original_name: string;
  profile_path?: string;
  character: string;
};

export type CrewMember = {
  known_for_department: string;
  name: string;
  original_name: string;
  profile_path?: string;
  department: string;
  job: string;
};

export type Credits = {
  cast: CastMember[];
  crew: CrewMember[];
};
