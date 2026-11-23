import api from '~/core/http';
import { isInvitationAddress } from './RankingInvitationService';
import { rankingIdPattern } from './RankingService';

export interface IssuedInvitation {
  invite_id: string;
  expires_at: string;
}
function path(rankingId: string) {
  if (!rankingIdPattern.test(rankingId)) throw new Error('Invalid ranking identifier');
  return `/rankings/${rankingId}/invitations`;
}
export default {
  async issue(rankingId: string, code: string): Promise<IssuedInvitation> {
    if (!isInvitationAddress(code)) throw new Error('Invalid invitation address');
    const { data, status } = await api.post(path(rankingId), { recipient_code: code });
    if (
      status !== 201 ||
      !data ||
      typeof data.invite_id !== 'string' ||
      !rankingIdPattern.test(data.invite_id) ||
      typeof data.expires_at !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        data.expires_at,
      ) ||
      !Number.isFinite(Date.parse(data.expires_at))
    )
      throw new Error('Unconfirmed invitation issuance');
    return { invite_id: data.invite_id, expires_at: data.expires_at };
  },
  async revoke(rankingId: string, inviteId: string): Promise<void> {
    if (!rankingIdPattern.test(inviteId)) throw new Error('Invalid invitation identifier');
    const { status } = await api.delete(`${path(rankingId)}/${inviteId}`);
    if (status !== 204) throw new Error('Unconfirmed invitation revocation');
  },
};
