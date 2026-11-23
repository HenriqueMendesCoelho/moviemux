import api from '~/core/http';
import { rankingIdPattern } from './RankingService';

export function canonicalJoinId(value: unknown): string | null {
  return typeof value === 'string' && rankingIdPattern.test(value) ? value.toLowerCase() : null;
}

export default async function joinOpenRanking(rankingId: string): Promise<void> {
  const id = canonicalJoinId(rankingId);
  if (!id) throw new Error('Invalid ranking identifier');
  const response = await api.post(`/movies/collections/${id}/join`);
  if (response.status !== 204 || ![undefined, null, ''].includes(response.data))
    throw new Error('Unconfirmed ranking join');
}
