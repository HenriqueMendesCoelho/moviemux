import api from '~/core/http';
export interface RankingSummary {
  ranking_id: string;
  name: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  admission: 'OPEN' | 'APPROVAL' | 'INVITATION';
  capabilities: string[];
}
export interface RankingPage {
  items: RankingSummary[];
  next_cursor: string | null;
}
export type CreateRanking = Pick<RankingSummary, 'visibility' | 'admission'> & { name: string };
export const rankingIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validRankingName(name: string) {
  const length = Array.from(name.trim()).length;
  return length > 0 && length <= 120;
}
export function rankingSummary(value: unknown): RankingSummary {
  if (!value || typeof value !== 'object') throw new Error('Invalid ranking response');
  const v = value as Record<string, unknown>;
  if (
    typeof v.ranking_id !== 'string' ||
    !rankingIdPattern.test(v.ranking_id) ||
    !(v.name === null || typeof v.name === 'string') ||
    !['PUBLIC', 'PRIVATE'].includes(String(v.visibility)) ||
    !['OPEN', 'APPROVAL', 'INVITATION'].includes(String(v.admission)) ||
    !Array.isArray(v.capabilities) ||
    !v.capabilities.every((c) => typeof c === 'string')
  )
    throw new Error('Invalid ranking response');
  return {
    ranking_id: v.ranking_id,
    name: v.name as string | null,
    visibility: v.visibility as RankingSummary['visibility'],
    admission: v.admission as RankingSummary['admission'],
    capabilities: [...v.capabilities] as string[],
  };
}
export default {
  async list(after?: string, signal?: AbortSignal): Promise<RankingPage> {
    if (after && !rankingIdPattern.test(after)) throw new Error('Invalid ranking cursor');
    const { data } = await api.get('/movies/collections', {
      params: { limit: 20, ...(after ? { after } : {}) },
      signal,
    });
    if (
      !data ||
      !Array.isArray(data.items) ||
      !(
        data.next_cursor === null ||
        (typeof data.next_cursor === 'string' && rankingIdPattern.test(data.next_cursor))
      )
    )
      throw new Error('Invalid ranking page');
    return { items: data.items.map(rankingSummary), next_cursor: data.next_cursor };
  },
  async create(input: CreateRanking): Promise<RankingSummary> {
    if (!validRankingName(input.name)) throw new Error('Invalid ranking name');
    const { data, status } = await api.post('/movies/collections', {
      name: input.name.trim(),
      visibility: input.visibility,
      admission: input.admission,
    });
    if (status !== 201) throw new Error('Unconfirmed ranking creation');
    return rankingSummary(data);
  },
};
