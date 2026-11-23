import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service, {
  RankingEntryRecoveryError,
} from '../../src/modules/ranking/services/RankingEntryRecoveryService';
const rank = 'abcdefab-2222-4222-8222-222222222222';
const previous = '7fffffff-ffff-ffff-ffff-ffffffffffff';
const entry = '8fffffff-ffff-ffff-ffff-ffffffffffff';
const route = `/movies/collections/${rank}/entries`;
const version = '9223372036854775806';
const receipt = { entry_id: entry, version: '9223372036854775807' };
const record = {
  entry_id: entry,
  title: null,
  removed_at: '2026-11-23T12:00:00Z',
  expires_at: '2026-11-24T12:00:00Z',
  version,
};
const page = { items: [record], next_cursor: null };
beforeEach(() => vi.resetAllMocks());
test('bodyless canonical directory returns exact null title/version without further lookup', async () => {
  const signal = new AbortController().signal;
  api.get.mockResolvedValueOnce({ status: 200, data: page });
  await expect(service.list(rank.toUpperCase(), previous, signal)).resolves.toEqual(page);
  expect(api.get).toHaveBeenCalledExactlyOnceWith(route + '/recovery', {
    params: { after: previous, limit: 20 },
    signal,
  });
  expect(api.post).not.toHaveBeenCalled();
});
test('restore-current sends only the selected opaque string version and returns scoped receipt', async () => {
  api.post.mockResolvedValueOnce({ status: 200, data: receipt });
  await expect(service.restoreCurrent(rank, entry, version)).resolves.toEqual(receipt);
  expect(api.post).toHaveBeenCalledExactlyOnceWith(route + '/' + entry + '/restore-current', {
    expected_version: version,
  });
});
test.each([42, '42 ', '0042', '9223372036854775807', '9223372036854775808'])(
  'invalid exact version sends no mutation: %s',
  async (value) => {
    await expect(service.restoreCurrent(rank, entry, value as string)).rejects.toBeInstanceOf(
      RankingEntryRecoveryError,
    );
    expect(api.post).not.toHaveBeenCalled();
  },
);
test('uncertain confirmation never retries or leaks Axios config', async () => {
  api.post.mockRejectedValueOnce({
    response: {
      status: 409,
      data: {
        data: { code: 'ranking.entry_recovery_expired' },
        extra: 'secret',
      },
    },
    config: { data: 'secret' },
  });
  const error = await service.restoreCurrent(rank, entry, version).catch((failure) => failure);
  expect(error).toMatchObject({ status: 409, code: 'ranking.entry_recovery_expired' });
  expect(error).not.toHaveProperty('config');
  expect(error).not.toHaveProperty('response');
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.get).not.toHaveBeenCalled();
});
test('unexpected list token/receipt never enters client state', async () => {
  api.get.mockResolvedValueOnce({
    status: 200,
    data: { ...page, items: [{ ...record, removal_token: 'forbidden' }] },
  });
  await expect(service.list(rank)).rejects.toBeInstanceOf(RankingEntryRecoveryError);
  api.post.mockResolvedValueOnce({ status: 200, data: { ...receipt, version } });
  await expect(service.restoreCurrent(rank, entry, version)).rejects.toBeInstanceOf(
    RankingEntryRecoveryError,
  );
});
