import type {
  Credits,
  MovieInfoTypeKit,
  MovieResultResponseTmdb,
  MovieSummaryTypeKit,
  MovieWatchProvider,
} from 'src/core/types/movie/MovieType';
import { staticMetadata } from 'src/core/query/staticMetadata';

const API_KIT = '/movie/tmdb';
// These are existing monolith defaults, not newly forwarded API parameters.
const portuguese = { language: 'pt-Br' };
const brazil = { ...portuguese, region: 'BR' };
const upstreamDefaults = { language: 'upstream-default', region: 'all-returned-regions' };
const pageNumber = (page = 1) => Math.max(1, Math.trunc(page) || 1);

function browse(path: string, params: Record<string, string | number>, dimensions = portuguese) {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
  return staticMetadata<MovieResultResponseTmdb>(
    'browse',
    `${API_KIT}${path}?${query}`,
    dimensions,
  );
}
/** Canonicalize only a homogeneous AND/OR genre set; preserve mixed operator semantics. */
export function normalizeDiscoverGenres(value?: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d+(\s*[,|]\s*\d+)*$/.test(value.trim())) return value;
  const comma = value.includes(',');
  if (comma && value.includes('|')) return value;
  return [...new Set(value.split(comma ? ',' : '|').map((item) => Number(item.trim())))]
    .sort((a, b) => a - b)
    .join(comma ? ',' : '|');
}

export default {
  summary(payload: { tmdb_id: number }): Promise<MovieSummaryTypeKit> {
    return staticMetadata('detail', `${API_KIT}/${payload.tmdb_id}/summary`, upstreamDefaults);
  },
  info(payload: { tmdb_id: number }): Promise<MovieInfoTypeKit> {
    return staticMetadata('detail', `/public/movie/tmdb/${payload.tmdb_id}/info`, upstreamDefaults);
  },
  searchByName(payload: {
    query: string;
    page?: number;
    language?: 'pt-Br';
  }): Promise<MovieResultResponseTmdb> {
    const language = payload.language || 'pt-Br';
    return browse(
      '',
      { query: payload.query.trim(), page: pageNumber(payload.page), language },
      { language },
    );
  },
  getMoviesPopular(page = 1): Promise<MovieResultResponseTmdb> {
    return browse('/popular', { page: pageNumber(page) }, brazil);
  },
  getMoviesNowPlaying(page = 1): Promise<MovieResultResponseTmdb> {
    return browse('/now-playing', { page: pageNumber(page) }, brazil);
  },
  getMoviesUpcoming(page = 1): Promise<MovieResultResponseTmdb> {
    return browse('/upcoming', { page: pageNumber(page) }, brazil);
  },
  getMoviesTopRated(page = 1): Promise<MovieResultResponseTmdb> {
    return browse('/top-rated', { page: pageNumber(page) }, brazil);
  },
  getMoviesRecommendations(movieId: number, page = 1): Promise<MovieResultResponseTmdb> {
    return browse(`/${movieId}/recommendations`, { page: pageNumber(page) });
  },
  getMoviesSimilar(movieId: number, page = 1): Promise<MovieResultResponseTmdb> {
    return browse(`/${movieId}/similar`, { page: pageNumber(page) });
  },
  getMoviesDiscover(
    sort?: string,
    page = 1,
    year?: number,
    with_genres?: string,
  ): Promise<MovieResultResponseTmdb> {
    const params: Record<string, string | number> = {};
    if (sort) params.sort = sort;
    params.page = pageNumber(page);
    if (year) params.year = year;
    const genres = normalizeDiscoverGenres(with_genres);
    if (genres) params.with_genres = genres;
    return browse('/discover', params);
  },
  getWatchProviders(tmdb_id: number): Promise<MovieWatchProvider> {
    return staticMetadata('providers', `${API_KIT}/${tmdb_id}/watch-providers`, upstreamDefaults);
  },
  getMovieCredits(tmdb_id: number): Promise<Credits> {
    return staticMetadata('detail', `${API_KIT}/${tmdb_id}/credits`, upstreamDefaults);
  },
};
