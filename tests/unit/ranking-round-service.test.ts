import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service from '../../src/modules/ranking/services/RankingRoundService';
const scope = {
  rankingId: '11111111-1111-4111-8111-111111111111',
  entryId: '22222222-2222-4222-8222-222222222222',
  roundId: '33333333-3333-4333-8333-333333333333',
};
const path = `/rankings/${scope.rankingId}/entries/${scope.entryId}/rounds/${scope.roundId}`;
afterEach(() => vi.resetAllMocks());
test('minimal detail verified IDs, number and tri-state', async () => {
  const signal = new AbortController().signal;
  for (const revealed of [true, false, null]) {
    const dto = { round_id: scope.roundId, round_number: 1, revealed };
    api.get.mockResolvedValueOnce({ status: 200, data: dto });
    expect(await service.enter(scope, signal)).toEqual(dto);
  }
  expect(api.get).toHaveBeenLastCalledWith(path, { signal });
});
test('wrong scope, invalid ordinal and extra scores fail closed', async () => {
  await expect(service.enter({ ...scope, roundId: '../evil' })).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
  for (const data of [
    { round_id: scope.entryId, round_number: 1, revealed: true },
    { round_id: scope.roundId, round_number: 0, revealed: true },
    { round_id: scope.roundId, round_number: 1, revealed: false, score: 10 },
  ]) {
    api.get.mockResolvedValueOnce({ status: 200, data });
    await expect(service.enter(scope)).rejects.toThrow();
  }
});
test('pure read chooses textual transport and preserves exact integer tokens and real zero', async () => {
  api.get.mockResolvedValueOnce({
    status: 200,
    data: `{"votes":9007199254740995,"total":9007199254740993,"round_id":"${scope.roundId}","revealed":true}`,
  });
  expect(await service.aggregate(scope)).toEqual({
    round_id: scope.roundId,
    revealed: true,
    total: 9007199254740993n,
    votes: 9007199254740995n,
  });
  expect(api.get).toHaveBeenLastCalledWith(
    path + '/ratings/aggregate',
    expect.objectContaining({ responseType: 'text' }),
  );
  api.get.mockResolvedValueOnce({
    status: 200,
    data: `{"round_id":"${scope.roundId}","revealed":true,"total":0,"votes":1}`,
  });
  expect(await service.aggregate(scope)).toMatchObject({ total: 0n, votes: 1n });
});
test.each(['false', 'null'])(
  'concealed/unknown %s only allows null counts and sums',
  async (value) => {
    api.get.mockResolvedValueOnce({
      status: 200,
      data: `{"round_id":"${scope.roundId}","revealed":${value},"total":null,"votes":null}`,
    });
    expect(await service.aggregate(scope)).toMatchObject({ total: null, votes: null });
    api.get.mockResolvedValueOnce({
      status: 200,
      data: `{"round_id":"${scope.roundId}","revealed":${value},"total":0,"votes":1}`,
    });
    await expect(service.aggregate(scope)).rejects.toThrow();
  },
);
test.each(['"1"', '1.0', '1e2', '-1', 'null', '0,"votes":3'])(
  'strict count token %s fails closed',
  async (votes) => {
    api.get.mockResolvedValueOnce({
      status: 200,
      data: `{"round_id":"${scope.roundId}","revealed":true,"total":5,"votes":${votes}}`,
    });
    await expect(service.aggregate(scope)).rejects.toThrow();
  },
);
