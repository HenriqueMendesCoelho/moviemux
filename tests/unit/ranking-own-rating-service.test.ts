import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import write, { validOwnScore } from '../../src/modules/ranking/services/RankingOwnRatingService';
const rank = '11111111-1111-4111-8111-111111111111',
  round = '22222222-2222-4222-8222-222222222222';
const path = `/movies/collections/${rank}/rounds/${round}/rating/me`;
afterEach(() => vi.resetAllMocks());
test('exact contextual POST201 and PATCH200 pass integer-only bodies', async () => {
  api.post.mockResolvedValue({ status: 201, data: { round_id: round, score: 0, extra: 'remove' } });
  api.patch.mockResolvedValue({ status: 200, data: { round_id: round, score: 10 } });
  expect(await write(rank, round, 'create', 0)).toEqual({ round_id: round, score: 0 });
  expect(await write(rank, round, 'edit', 10)).toEqual({ round_id: round, score: 10 });
  expect(api.post).toHaveBeenCalledWith(path, { score: 0 });
  expect(api.patch).toHaveBeenCalledWith(path, { score: 10 });
});
test.each([null, '0', -1, 11, 1.5, NaN, true])(
  'invalid input %s is rejected before writes',
  async (score) => {
    expect(validOwnScore(score)).toBe(false);
    await expect(write(rank, round, 'create', score as number)).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  },
);
test('mismatched method status, scope or score is not a confirmed write', async () => {
  for (const payload of [
    { status: 200, data: { round_id: round, score: 0 } },
    { status: 201, data: { round_id: rank, score: 0 } },
    { status: 201, data: { round_id: round, score: 1 } },
  ]) {
    api.post.mockResolvedValueOnce(payload);
    await expect(write(rank, round, 'create', 0)).rejects.toThrow('Unconfirmed');
  }
  await expect(write(rank, '../script', 'edit', 10)).rejects.toThrow('Invalid');
  expect(api.patch).not.toHaveBeenCalled();
});
