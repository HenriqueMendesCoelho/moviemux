import api from '~/core/http';
import { rankingIdPattern } from './RankingService';
export type RatingIntent = 'create' | 'edit';
export function validOwnScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}
export default async function writeOwnRating(
  rankingId: string,
  roundId: string,
  intent: RatingIntent,
  score: number,
): Promise<{ round_id: string; score: number }> {
  if (
    !rankingIdPattern.test(rankingId) ||
    !rankingIdPattern.test(roundId) ||
    !validOwnScore(score) ||
    (intent !== 'edit' && intent !== 'create')
  )
    throw new Error('Invalid rating command');
  const path = `/rankings/${rankingId}/rounds/${roundId}/rating/me`;
  const result =
    intent === 'create' ? await api.post(path, { score }) : await api.patch(path, { score });
  const value = result.data;
  if (
    result.status !== (intent === 'create' ? 201 : 200) ||
    !value ||
    value.round_id !== roundId ||
    !validOwnScore(value.score) ||
    value.score !== score
  )
    throw new Error('Unconfirmed rating command');
  return { round_id: roundId, score: value.score };
}
