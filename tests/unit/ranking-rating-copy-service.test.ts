import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service, {
  RankingRatingCopyError,
} from '../../src/modules/ranking/services/RankingRatingCopyService';

const dest = {
  rankingId: 'abcdefab-2222-4222-8222-222222222222',
  entryId: 'abcdefab-3333-4333-8333-333333333333',
  roundId: 'abcdefab-4444-4444-8444-444444444444',
};
const source = { ...dest, rankingId: 'abcdefab-5555-4555-8555-555555555555' };
const path = `/movies/collections/${dest.rankingId}/entries/${dest.entryId}/rounds/${dest.roundId}/rating/me`;
const token = 'Ab_-'.repeat(66);
const ready = {
  status: 'READY',
  source_score: 0,
  preview_token: token,
  expires_at: '2026-11-23T01:02:03.123456789Z',
};
const receipt = { round_id: dest.roundId, score: 0 };
beforeEach(() => vi.resetAllMocks());

test('uses canonical explicit destination/source and returns only actor preview/receipt', async () => {
  const signal = new AbortController().signal;
  api.post.mockResolvedValueOnce({ status: 200, data: ready });
  api.post.mockResolvedValueOnce({ status: 201, data: receipt });
  await expect(
    service.preview({ ...dest, rankingId: dest.rankingId.toUpperCase() }, source, signal),
  ).resolves.toEqual(ready);
  expect(api.post).toHaveBeenLastCalledWith(
    path + '/copy-preview',
    {
      source: { ranking_id: source.rankingId, entry_id: source.entryId, round_id: source.roundId },
    },
    { signal },
  );
  await expect(service.apply(dest, token)).resolves.toEqual(receipt);
  expect(api.post).toHaveBeenLastCalledWith(path + '/copy-apply', { preview_token: token });
  expect(api.post).toHaveBeenCalledTimes(2);
});
test('validates distinct rank and token format before making any request', async () => {
  await expect(service.preview(dest, dest)).rejects.toMatchObject({
    status: 404,
    code: 'ranking.not_found',
  });
  await expect(
    service.preview(dest, { ...source, entryId: source.entryId + '\n' }),
  ).rejects.toBeInstanceOf(RankingRatingCopyError);
  await expect(service.apply(dest, token.slice(1) + '\n')).rejects.toBeInstanceOf(
    RankingRatingCopyError,
  );
  expect(api.post).not.toHaveBeenCalled();
});
test('does not pass along Axios configuration, token or raw peer data on errors', async () => {
  api.post.mockRejectedValueOnce({
    response: { status: 409, data: { data: { code: 'ranking.rating_copy_stale' }, score: 10 } },
    config: { data: { preview_token: token } },
    message: token,
  });
  const error = await service.apply(dest, token).catch((value) => value);
  expect(error).toMatchObject({ status: 409, code: 'ranking.rating_copy_stale' });
  expect(error).not.toHaveProperty('response');
  expect(error).not.toHaveProperty('config');
  expect(error).not.toHaveProperty('cause');
  expect(String(error)).not.toContain(token);
  expect(api.post).toHaveBeenCalledTimes(1);
});
test('lost or malformed response is ambiguous and never triggers any retry', async () => {
  api.post.mockResolvedValueOnce({
    status: 201,
    data: { ...receipt, round_id: source.rankingId, peer: 'unallowed' },
  });
  await expect(service.apply(dest, token)).rejects.toBeInstanceOf(RankingRatingCopyError);
  expect(api.post).toHaveBeenCalledTimes(1);
});
test('honors matching backend default-off status and rejects unverified peer/blocked preview state', async () => {
  api.post.mockRejectedValueOnce({
    response: { status: 503, data: { data: { code: 'ranking.rating_copy_unavailable' } } },
  });
  await expect(service.preview(dest, source)).rejects.toMatchObject({
    status: 503,
    code: 'ranking.rating_copy_unavailable',
  });
  api.post.mockResolvedValueOnce({ status: 200, data: { ...ready, status: 'DESTINATION_EXISTS' } });
  await expect(service.preview(dest, source)).rejects.toBeInstanceOf(RankingRatingCopyError);
});
