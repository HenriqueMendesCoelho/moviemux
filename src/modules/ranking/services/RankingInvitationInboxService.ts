import api from '~/core/http';
import { rankingIdPattern } from './RankingService';

export interface IncomingInvitation {
  invite_id: string;
  ranking_id: string;
  ranking_name: string | null;
  expires_at: string;
}

function isId(id: unknown): id is string {
  return typeof id === 'string' && rankingIdPattern.test(id);
}
function projection(value: unknown): IncomingInvitation {
  if (!value || typeof value !== 'object') throw new Error('Invalid invitation');
  const v = value as Record<string, unknown>;
  if (
    !isId(v.invite_id) ||
    !isId(v.ranking_id) ||
    !(typeof v.ranking_name === 'string' || v.ranking_name === null) ||
    typeof v.expires_at !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      v.expires_at,
    ) ||
    !Number.isFinite(Date.parse(v.expires_at))
  )
    throw new Error('Invalid invitation');
  return {
    invite_id: v.invite_id,
    ranking_id: v.ranking_id,
    ranking_name: v.ranking_name,
    expires_at: v.expires_at,
  };
}

export default {
  async incoming(
    after?: string,
    signal?: AbortSignal,
  ): Promise<{ items: IncomingInvitation[]; next_cursor: string | null }> {
    if (after !== undefined && !isId(after)) throw new Error('Invalid invitation cursor');
    const { status, data } = await api.get('/ranking-invitations/incoming', {
      params: { limit: 20, ...(after ? { after } : {}) },
      signal,
    });
    if (
      status !== 200 ||
      !data ||
      !Array.isArray(data.items) ||
      !(isId(data.next_cursor) || data.next_cursor === null)
    )
      throw new Error('Invalid invitation page');
    return { items: data.items.map(projection), next_cursor: data.next_cursor };
  },
  async accept(invite: Pick<IncomingInvitation, 'ranking_id' | 'invite_id'>): Promise<void> {
    if (!isId(invite.ranking_id) || !isId(invite.invite_id))
      throw new Error('Invalid invitation identifiers');
    const { status } = await api.post(
      `/rankings/${invite.ranking_id}/invitations/${invite.invite_id}/accept`,
    );
    if (status !== 204) throw new Error('Unconfirmed invitation acceptance');
  },
};
