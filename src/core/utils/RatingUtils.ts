export type RatingTone = 'perfect' | 'good' | 'medium' | 'low';

/** Classify the raw score, never its rounded display value. */
export function ratingTone(score: number | null | undefined): RatingTone {
  const value = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  if (value === 10) return 'perfect';
  return value > 7 ? 'good' : value > 5 ? 'medium' : 'low';
}
