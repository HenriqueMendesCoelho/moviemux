import type Movie from 'src/core/domain/movie/movie';
import type { MovieNoteType } from 'src/core/types/movie/MovieType';

/** Clone mutable nested fields so editor drafts never modify the displayed server record. */
export function cloneMovie(movie: Movie): Movie {
  return {
    ...movie,
    genres: movie.genres?.map((genre) => ({ ...genre })),
    notes: movie.notes?.map((note) => ({ ...note, user: { ...note.user } })),
    release_date:
      movie.release_date instanceof Date ? new Date(movie.release_date) : movie.release_date,
    created_at: movie.created_at instanceof Date ? new Date(movie.created_at) : movie.created_at,
    updated_at: movie.updated_at instanceof Date ? new Date(movie.updated_at) : movie.updated_at,
  };
}

export function dateOnly(value?: string | Date): string {
  if (!value) return '';
  const text =
    value instanceof Date ? (Number.isNaN(value.getTime()) ? '' : value.toISOString()) : value;
  return /^\d{4}-\d{2}-\d{2}/.exec(text)?.[0] || '';
}
export function fullReleaseDate(
  value?: string | Date,
  locale = 'pt-BR',
  unavailable = 'Data não informada',
): string {
  const calendarDate = dateOnly(value);
  if (!calendarDate) return unavailable;
  const parsed = new Date(`${calendarDate}T12:00:00Z`);
  // Reject invalid timestamps and dates normalized into another month (e.g. February 30).
  if (!Number.isFinite(parsed.getTime()) || dateOnly(parsed) !== calendarDate) return unavailable;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
export function noteTimestamp(note: MovieNoteType, kind: 'created' | 'updated'): number {
  const value =
    kind === 'created' ? note.createdAt || note.created_at : note.updatedAt || note.updated_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}
export function sortNotes(
  notes: MovieNoteType[],
  order: string,
  locale = 'pt-BR',
): MovieNoteType[] {
  return [...notes].sort((a, b) => {
    if (order === 'note') return (b.note ?? -Infinity) - (a.note ?? -Infinity) || 0;
    if (order === 'updated') return noteTimestamp(b, 'updated') - noteTimestamp(a, 'updated');
    return a.user.name.localeCompare(b.user.name, locale) * (order === 'name-desc' ? -1 : 1);
  });
}
export function hasMovieFields(movie: Movie): boolean {
  return Object.values(movie).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '',
  );
}
export function validRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}
export function mergeReview(
  notes: MovieNoteType[],
  note: MovieNoteType,
  deleted = false,
): MovieNoteType[] {
  const result = notes.filter((existing) => existing.user.id !== note.user.id);
  return deleted ? result : [...result, note];
}
export function tmdbImageUrl(base: string, path?: string, size = 'w342'): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/$/, '')}/${size}/${path.replace(/^\//, '')}`;
}

/** TMDB poster widths; browser srcset selection accounts for rendered width + DPR.
 * https://developer.themoviedb.org/docs/image-basics
 * https://developer.themoviedb.org/reference/configuration-details
 * External image URLs remain untouched; never manufacture variants for other hosts.
 */
export function tmdbPosterSrcset(base: string, source?: string): string | undefined {
  if (!source) return undefined;
  let path = source;
  let imageBase = base.replace(/\/$/, '');
  if (/^https?:\/\//i.test(source)) {
    const bases = [imageBase, 'https://image.tmdb.org/t/p', 'http://image.tmdb.org/t/p'];
    const match = bases.find((candidate) => source.startsWith(`${candidate}/`));
    if (!match) return undefined;
    imageBase = match;
    path = source.slice(match.length);
  }
  path = path.replace(/^\//, '').replace(/^(?:w\d+|original)\//, '');
  if (!path || /\s/.test(path)) return undefined;
  return [92, 154, 185, 342, 500, 780]
    .map((width) => `${imageBase}/w${width}/${path} ${width}w`)
    .join(', ');
}
