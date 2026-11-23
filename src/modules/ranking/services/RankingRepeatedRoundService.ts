import api from '~/core/http';
import { rankingIdPattern } from './RankingService';
import { canonicalRoundDescription } from '../utils/roundDescription';

export interface RoundCreationIntent {
  rankingId: string;
  entryId: string;
  generation: string;
  commandId: string;
  description: string | null;
}
export interface CreatedRound {
  roundId: string;
  ordinal: bigint;
  replayed: boolean;
}
function invalid(): never {
  throw new Error('Unconfirmed round operation');
}
function ranking(id: string) {
  if (!rankingIdPattern.test(id)) return invalid();
  return `/movies/collections/${id.toLowerCase()}`;
}
function enabled(value: unknown): boolean {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.keys(value).length !== 1 ||
    !('repeat_enabled' in value) ||
    typeof value.repeat_enabled !== 'boolean'
  )
    return invalid();
  return value.repeat_enabled;
}
const receipt =
  /^\{"round_id":"([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})","round_number":([1-9][0-9]{0,18})\}$/;

export default {
  async settings(id: string, signal?: AbortSignal): Promise<boolean> {
    const { data, status } = await api.get(`${ranking(id)}/settings/rounds`, { signal });
    if (status !== 200) return invalid();
    return enabled(data);
  },
  async setSettings(id: string, value: boolean): Promise<boolean> {
    if (typeof value !== 'boolean') return invalid();
    const { data, status } = await api.put(`${ranking(id)}/settings/rounds`, {
      repeat_enabled: value,
    });
    if (status !== 200 || enabled(data) !== value) return invalid();
    return value;
  },
  async create({
    rankingId,
    entryId,
    commandId,
    description,
  }: RoundCreationIntent): Promise<CreatedRound> {
    if (
      !rankingIdPattern.test(entryId) ||
      !rankingIdPattern.test(commandId) ||
      (description !== null && typeof description !== 'string') ||
      canonicalRoundDescription(description) !== description
    )
      return invalid();
    const { data, status } = await api.post(
      `${ranking(rankingId)}/entries/${entryId.toLowerCase()}/rounds`,
      { command_id: commandId.toLowerCase(), description },
      { responseType: 'text', transformResponse: [(value: unknown) => value] },
    );
    const match = typeof data === 'string' ? receipt.exec(data) : null;
    if (
      (status !== 200 && status !== 201) ||
      !match?.[1] ||
      !match[2] ||
      (match[2].length === 19 && match[2] > '9223372036854775807')
    )
      return invalid();
    return { roundId: match[1], ordinal: BigInt(match[2]), replayed: status === 200 };
  },
};
