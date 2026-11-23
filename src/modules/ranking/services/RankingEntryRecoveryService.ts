import api from '~/core/http';
import { isRecoveryId } from '../utils/entryRecoveryContract';
import {
  isExpectedRecoveryVersion,
  recoveryErrorCode,
  recoveryPage,
  RECOVERY_DEFAULT_LIMIT,
  restoredEntry,
} from '../utils/entryRecoveryDirectory';

export type {
  RecoverableEntry,
  RecoveryPage,
  RestoredEntry,
} from '../utils/entryRecoveryDirectory';

export class RankingEntryRecoveryError extends Error {
  constructor(
    readonly status?: number,
    readonly code?: ReturnType<typeof recoveryErrorCode>,
  ) {
    super('Entry recovery unavailable or unconfirmed');
    this.name = 'RankingEntryRecoveryError';
  }
}
function invalid(): never {
  throw new RankingEntryRecoveryError();
}
function scope(value: string) {
  const id = value.toLowerCase();
  return isRecoveryId(id) ? id : invalid();
}
function endpoint(rankingId: string) {
  return `/movies/collections/${scope(rankingId)}/entries`;
}
function clean(kind: 'list' | 'restore', error: unknown) {
  const response = (
    error as { response?: { status?: unknown; data?: { data?: { code?: unknown } } } } | undefined
  )?.response;
  const status = response?.status;
  return typeof status === 'number'
    ? new RankingEntryRecoveryError(
        status,
        recoveryErrorCode(kind, status, response?.data?.data?.code),
      )
    : new RankingEntryRecoveryError();
}
export default {
  async list(rankingId: string, after?: string, signal?: AbortSignal) {
    if (import.meta.server) return invalid();
    const options = {
      ...(after !== undefined ? { after: scope(after) } : {}),
      limit: RECOVERY_DEFAULT_LIMIT,
    };
    const response = await api
      .get(`${endpoint(rankingId)}/recovery`, { params: options, signal })
      .catch((error: unknown) => {
        throw clean('list', error);
      });
    const page = recoveryPage(response.data, options);
    if (response.status !== 200 || !page) return invalid();
    return page;
  },
  async restoreCurrent(rankingId: string, entryId: string, expectedVersion: string) {
    if (import.meta.server || !isExpectedRecoveryVersion(expectedVersion)) return invalid();
    const entry = scope(entryId);
    const response = await api
      .post(`${endpoint(rankingId)}/${entry}/restore-current`, {
        expected_version: expectedVersion,
      })
      .catch((error: unknown) => {
        throw clean('restore', error);
      });
    const receipt = restoredEntry(response.data, entry, expectedVersion);
    if (response.status !== 200 || !receipt) return invalid();
    return receipt;
  },
};
