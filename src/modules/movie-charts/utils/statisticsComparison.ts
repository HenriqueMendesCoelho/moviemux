export type PersonalStatistics = {
  ratings_given: number | null;
  registered_movies: number | null;
  display_time: number | null;
  average_rating_movies: number | null;
};

export function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function count(value: unknown): number | null {
  const number = nonNegativeNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

export function rating(value: unknown): number | null {
  const number = nonNegativeNumber(value);
  return number !== null && number <= 10 ? number : null;
}

export function personalStatistics(value: unknown): PersonalStatistics {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    ratings_given: count(source.ratings_given),
    registered_movies: count(source.registered_movies),
    display_time: nonNegativeNumber(source.display_time),
    average_rating_movies: rating(source.average_rating_movies),
  };
}

export function personalAverages(statistics?: PersonalStatistics) {
  if (!statistics || statistics.ratings_given === null || statistics.ratings_given === 0)
    return { rating: null, runtime: null };
  return {
    rating: statistics.average_rating_movies,
    runtime:
      statistics.display_time === null ? null : statistics.display_time / statistics.ratings_given,
  };
}

export function formatRating(value: number | null): string {
  return value === null
    ? '—'
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDuration(value: number | null): string {
  if (value === null) return '—';
  const minutes = Math.round(value);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours.toLocaleString('pt-BR')}h${remainder ? ` ${remainder}min` : ''}`
    : `${minutes}min`;
}
