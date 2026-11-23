import api from '~/core/http';
import { rankingIdPattern } from './RankingService';

export interface RoundScope {
  rankingId: string;
  entryId: string;
  roundId: string;
}
export interface RoundDisclosure {
  round_id: string;
  round_number: number;
  revealed: boolean | null;
}
export type RoundAggregate =
  | { round_id: string; revealed: true; total: bigint; votes: bigint }
  | { round_id: string; revealed: false | null; total: null; votes: null };

function invalid(): never {
  throw new Error('Invalid ranking round projection');
}
function path(scope: RoundScope) {
  if (
    ![scope.rankingId, scope.entryId, scope.roundId].every((value) => rankingIdPattern.test(value))
  )
    invalid();
  return `/movies/collections/${scope.rankingId}/entries/${scope.entryId}/rounds/${scope.roundId}`;
}
function disclosure(data: unknown, expected: string): RoundDisclosure {
  if (!data || typeof data !== 'object') return invalid();
  const v = data as Record<string, unknown>;
  if (
    Object.keys(v).length !== 3 ||
    v.round_id !== expected ||
    typeof v.round_number !== 'number' ||
    !Number.isSafeInteger(v.round_number) ||
    v.round_number <= 0 ||
    !(typeof v.revealed === 'boolean' || v.revealed === null)
  )
    return invalid();
  return { round_id: expected, round_number: v.round_number, revealed: v.revealed };
}
const dto = /^[ \t\r\n]*\{([^{}]*)\}[ \t\r\n]*$/;
const member =
  /^[ \t\r\n]*"(round_id|revealed|total|votes)"[ \t\r\n]*:[ \t\r\n]*("[a-fA-F0-9-]+"|true|false|null|0|-?[1-9][0-9]*)[ \t\r\n]*$/;
function exactRoundAggregate(data: unknown, expected: string): RoundAggregate {
  // This flat DTO contains only these literal primitives. Never parse its integers as Number.
  const fields = typeof data === 'string' ? dto.exec(data)?.[1]?.split(',') : undefined;
  if (fields?.length !== 4) return invalid();
  const fieldsByName = new Map<string, string>();
  for (const field of fields) {
    const match = member.exec(field);
    if (!match?.[1] || !match[2] || fieldsByName.has(match[1])) return invalid();
    fieldsByName.set(match[1], match[2]);
  }
  const revealed = fieldsByName.get('revealed'),
    total = fieldsByName.get('total'),
    votes = fieldsByName.get('votes');
  if (fieldsByName.get('round_id') !== JSON.stringify(expected)) return invalid();
  if (revealed === 'false' || revealed === 'null') {
    if (total !== 'null' || votes !== 'null') return invalid();
    return {
      round_id: expected,
      revealed: revealed === 'false' ? false : null,
      total: null,
      votes: null,
    };
  }
  if (
    revealed !== 'true' ||
    !total ||
    !votes ||
    !/^(0|-?[1-9][0-9]*)$/.test(total) ||
    !/^(0|[1-9][0-9]*)$/.test(votes)
  )
    return invalid();
  const sum = BigInt(total),
    count = BigInt(votes);
  if (count === 0n && sum !== 0n) return invalid();
  return { round_id: expected, revealed: true, total: sum, votes: count };
}
export default {
  /** Side-effecting GET. Only invoke as a direct consequence of the person's explicit visit. */
  async enter(scope: RoundScope, signal?: AbortSignal): Promise<RoundDisclosure> {
    const { status, data } = await api.get(path(scope), { signal });
    if (status !== 200) return invalid();
    return disclosure(data, scope.roundId);
  },
  /** Read-only, no timing transition; keep BigInteger sums/counts exact. */
  async aggregate(scope: RoundScope, signal?: AbortSignal): Promise<RoundAggregate> {
    const { status, data } = await api.get(`${path(scope)}/ratings/aggregate`, {
      signal,
      responseType: 'text',
      transformResponse: [(value: unknown) => value],
    });
    if (status !== 200) return invalid();
    return exactRoundAggregate(data, scope.roundId);
  },
};
