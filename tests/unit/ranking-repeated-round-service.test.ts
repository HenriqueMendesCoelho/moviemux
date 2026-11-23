import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service from '../../src/modules/ranking/services/RankingRepeatedRoundService';
const rankingId = 'abcdefab-2222-4222-8222-222222222222',
  entryId = '22222222-2222-4222-8222-222222222222',
  commandId = '33333333-3333-4333-8333-333333333333';
const roundId = '44444444-4444-4444-8444-444444444444';
const intent = { rankingId, entryId, commandId, generation: 'session', description: 'reason' };
const path = `/movies/collections/${rankingId}`;
afterEach(() => vi.resetAllMocks());
test('settings uses exact route/boolean, no coercion or authority from non-200', async () => {
  const signal = new AbortController().signal;
  api.get
    .mockResolvedValueOnce({ status: 200, data: { repeat_enabled: false } })
    .mockResolvedValueOnce({ status: 200, data: { repeat_enabled: 'true' } })
    .mockResolvedValueOnce({ status: 202, data: { repeat_enabled: true } });
  expect(await service.settings(rankingId, signal)).toBe(false);
  expect(api.get).toHaveBeenCalledWith(path + '/settings/rounds', { signal });
  await expect(service.settings(rankingId)).rejects.toThrow();
  await expect(service.settings(rankingId)).rejects.toThrow();
  api.put.mockResolvedValueOnce({ status: 200, data: { repeat_enabled: true } });
  expect(await service.setSettings(rankingId, true)).toBe(true);
  expect(api.put).toHaveBeenCalledExactlyOnceWith(path + '/settings/rounds', {
    repeat_enabled: true,
  });
});
test.each([200, 201])(
  'receipt %s retains exact Long and only approved request body',
  async (status) => {
    api.post.mockResolvedValueOnce({
      status,
      data: `{"round_id":"${roundId}","round_number":9223372036854775807}`,
    });
    expect(await service.create(intent)).toEqual({
      roundId,
      ordinal: 9223372036854775807n,
      replayed: status === 200,
    });
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      path + '/entries/' + entryId + '/rounds',
      { command_id: commandId, description: 'reason' },
      expect.objectContaining({ responseType: 'text' }),
    );
  },
);
test.each(['0', '1.0', '1e3', '9223372036854775808', '-1', '"1"'])(
  'invalid ordinal %s stays unconfirmed',
  async (ordinal) => {
    api.post.mockResolvedValueOnce({
      status: 201,
      data: `{"round_id":"${roundId}","round_number":${ordinal}}`,
    });
    await expect(service.create(intent)).rejects.toThrow();
  },
);
test('noncanonical prose or invalid scopes never create a command', async () => {
  await expect(service.create({ ...intent, description: ' trim ' })).rejects.toThrow();
  await expect(service.create({ ...intent, entryId: '../elsewhere' })).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
});
