import api from '~/core/http';
import {
  entryRecoveryReceipt,
  MAX_ENTRY_VERSION,
  isRecoveryId,
  type EntryRecoveryReceipt,
} from '../utils/entryRecoveryContract';

import { recoveryErrorCode } from '../utils/entryRecoveryDirectory';

export class RankingEntryRemovalError extends Error {
  constructor(
    readonly status?: number,
    readonly code?: ReturnType<typeof recoveryErrorCode>,
  ) {
    super('Entry removal unavailable or unconfirmed');
    this.name = 'RankingEntryRemovalError';
  }
}
function invalid(): never {
  throw new RankingEntryRemovalError();
}
function clean(kind: 'preview' | 'remove', error: unknown) {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | undefined)
    ?.response;
  const status = response?.status;
  if (typeof status !== 'number') return new RankingEntryRemovalError();
  let payload = response?.data;
  if (typeof payload === 'string' && payload.length <= 4096) {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = undefined;
    }
  }
  const code = (payload as { data?: { code?: unknown } } | undefined)?.data?.code;
  return new RankingEntryRemovalError(status, recoveryErrorCode(kind, status, code));
}
function endpoint(rankingId: string, entryId: string) {
  const ranking = rankingId.toLowerCase();
  const entry = entryId.toLowerCase();
  if (!isRecoveryId(ranking) || !isRecoveryId(entry)) return invalid();
  return { url: `/movies/collections/${ranking}/entries/${entry}`, entry };
}
const responseOptions = {
  responseType: 'text' as const,
  transformResponse: [(data: unknown) => data],
};
function check(status: number, data: unknown, entry: string): EntryRecoveryReceipt {
  const receipt = typeof data === 'string' && entryRecoveryReceipt(data, entry, 'client');
  if (status !== 200 || !receipt) return invalid();
  return receipt;
}
export default {
  async preview(rankingId: string, entryId: string, signal?: AbortSignal) {
    if (import.meta.server) return invalid();
    const { url, entry } = endpoint(rankingId, entryId);
    const { data, status } = await api
      .get(`${url}/removal-preview`, {
        ...responseOptions,
        signal,
      })
      .catch((error: unknown) => {
        throw clean('preview', error);
      });
    return check(status, data, entry);
  },
  async remove(rankingId: string, entryId: string, version: bigint) {
    if (import.meta.server) return invalid();
    const { url, entry } = endpoint(rankingId, entryId);
    if (typeof version !== 'bigint' || version < 0n || version >= MAX_ENTRY_VERSION)
      return invalid();
    const { data, status } = await api
      .delete(url, {
        ...responseOptions,
        headers: { 'content-type': 'application/json' },
        // Do not let Axios normalize the exact Long literal through Number.
        transformRequest: [(body: unknown) => body],
        data: `{"expected_version":${version},"confirm":true}`,
      })
      .catch((error: unknown) => {
        throw clean('remove', error);
      });
    const receipt = check(status, data, entry);
    if (receipt.removed_at === null || receipt.version !== version + 1n) return invalid();
    return receipt;
  },
};
