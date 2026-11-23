import api from '~/core/http';
import {
  isMemberRosterId,
  MEMBER_ROSTER_DEFAULT_LIMIT,
  memberRosterErrorCode,
  memberRosterPage,
  rosterCapabilities,
  type RosterOperation,
  type RankingCapability,
} from '../utils/memberRosterContract';

export {
  ROSTER_CAPABILITIES,
  type RankingCapability,
  type OwnerRosterMember,
  type OwnerRosterPage,
} from '../utils/memberRosterContract';

export class RankingOwnerRosterError extends Error {
  constructor(
    readonly status?: number,
    readonly code?: ReturnType<typeof memberRosterErrorCode>,
  ) {
    super('Membership roster unavailable or unconfirmed');
    this.name = 'RankingOwnerRosterError';
  }
}
function invalid(): never {
  throw new RankingOwnerRosterError();
}
function scope(value: string) {
  const id = value.toLowerCase();
  return isMemberRosterId(id) ? id : invalid();
}
function endpoint(rankingId: string) {
  return `/movies/collections/${scope(rankingId)}/members`;
}
function clean(kind: RosterOperation, error: unknown) {
  const response = (
    error as { response?: { status?: unknown; data?: { data?: { code?: unknown } } } } | undefined
  )?.response;
  const status = response?.status;
  return typeof status === 'number'
    ? new RankingOwnerRosterError(
        status,
        memberRosterErrorCode(kind, status, response?.data?.data?.code),
      )
    : new RankingOwnerRosterError();
}
export default {
  async list(rankingId: string, after?: string, signal?: AbortSignal) {
    if (import.meta.server) return invalid();
    const options = {
      ...(after !== undefined ? { after: scope(after) } : {}),
      limit: MEMBER_ROSTER_DEFAULT_LIMIT,
    };
    const response = await api
      .get(endpoint(rankingId), { params: options, signal })
      .catch((error: unknown) => {
        throw clean('list', error);
      });
    const page = memberRosterPage(response.data, options);
    if (response.status !== 200 || !page) return invalid();
    return page;
  },
  async replaceCapabilities(
    rankingId: string,
    membershipId: string,
    capabilities: readonly RankingCapability[],
  ): Promise<void> {
    if (import.meta.server) return invalid();
    const grants = rosterCapabilities(capabilities);
    if (!grants) return invalid();
    const response = await api
      .put(`${endpoint(rankingId)}/by-membership/${scope(membershipId)}/capabilities`, {
        capabilities: grants,
      })
      .catch((error: unknown) => {
        throw clean('replace', error);
      });
    if (response.status !== 204 || (response.data != null && response.data !== ''))
      return invalid();
  },
};
