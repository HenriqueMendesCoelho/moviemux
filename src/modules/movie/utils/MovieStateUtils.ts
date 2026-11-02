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
export function fullReleaseDate(value?: string | Date): string {
  const [year, month, day] = dateOnly(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : 'Data não informada';
}
export function noteTimestamp(note: MovieNoteType, kind: 'created' | 'updated'): number {
  const value =
    kind === 'created' ? note.createdAt || note.created_at : note.updatedAt || note.updated_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}
export function sortNotes(notes: MovieNoteType[], order: string): MovieNoteType[] {
  return [...notes].sort((a, b) => {
    if (order === 'note') return (b.note ?? -Infinity) - (a.note ?? -Infinity) || 0;
    if (order === 'updated') return noteTimestamp(b, 'updated') - noteTimestamp(a, 'updated');
    return a.user.name.localeCompare(b.user.name) * (order === 'name-desc' ? -1 : 1);
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
