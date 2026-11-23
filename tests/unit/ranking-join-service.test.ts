import { afterEach, expect, test, vi } from 'vitest';
const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: http }));
import join, { canonicalJoinId } from '../../src/modules/ranking/services/RankingJoinService';
const id = 'abcdefab-2222-4222-8222-222222222222';
afterEach(() => vi.resetAllMocks());
test('canonical lowercase UUID and exact bodyless scoped POST', async () => {
  http.post.mockResolvedValue({ status: 204, data: '' });
  expect(canonicalJoinId(id.toUpperCase())).toBe(id);
  await join(id.toUpperCase());
  expect(http.post.mock.calls).toEqual([[`/rankings/${id}/join`]]);
});
test.each([undefined, [], {}, '../join', 'abc', 'abcdefab-2222-4222-8222-222222222222?another=1'])(
  'invalid route %s is not forwarded',
  async (value) => {
    expect(canonicalJoinId(value)).toBeNull();
    await expect(join(value as string)).rejects.toThrow();
    expect(http.post).not.toHaveBeenCalled();
  },
);
test.each([
  { status: 200, data: null },
  { status: 204, data: { title: 'forbidden' } },
  { status: 202, data: '' },
])('rejects unconfirmed response', async (response) => {
  http.post.mockResolvedValue(response);
  await expect(join(id)).rejects.toThrow();
});
