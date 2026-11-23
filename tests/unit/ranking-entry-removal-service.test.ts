import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service from '../../src/modules/ranking/services/RankingEntryRemovalService';
import { RECOVERY_WARNING } from '../../src/modules/ranking/utils/entryRecoveryContract';
const id = 'abcdefab-2222-4222-8222-222222222222';
const entry = 'abcdefab-3333-4333-8333-333333333333';
const endpoint = `/movies/collections/${id}/entries/${entry}`;
const current = 9007199254740997n;
const removed = '2026-11-23T01:02:03.123456789Z';
const expires = '2026-11-24T01:02:03.123456789Z';
function raw(version: bigint, done = false) {
  return `{"entry_id":"${entry}","removed_at":${done ? JSON.stringify(removed) : 'null'},"expires_at":${done ? JSON.stringify(expires) : 'null'},"warning_code":"${RECOVERY_WARNING}","recovery_seconds":86400,"version":${version}}`;
}
beforeEach(() => vi.resetAllMocks());

test('canonical preview and explicit DELETE retain version exactly without exposing token', async () => {
  const signal = new AbortController().signal;
  api.get.mockResolvedValueOnce({ status: 200, data: raw(current) });
  api.delete.mockResolvedValueOnce({ status: 200, data: raw(current + 1n, true) });
  const preview = await service.preview(id.toUpperCase(), entry, signal);
  const result = await service.remove(id, entry, preview.version);
  expect(result.version).toBe(current + 1n);
  expect(result.expires_at).toBe(expires);
  expect(result).not.toHaveProperty('removal_token');
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    endpoint + '/removal-preview',
    expect.objectContaining({ responseType: 'text', signal }),
  );
  expect(api.delete).toHaveBeenCalledExactlyOnceWith(
    endpoint,
    expect.objectContaining({
      responseType: 'text',
      headers: { 'content-type': 'application/json' },
      data: `{"expected_version":${current},"confirm":true}`,
    }),
  );
});
test.each([0, '0', -1n, 9223372036854775807n] as const)(
  'bad client version never triggers DELETE %s',
  async (version) => {
    await expect(service.remove(id, entry, version as bigint)).rejects.toThrow();
    expect(api.delete).not.toHaveBeenCalled();
  },
);
test.each([
  { status: 200, data: JSON.parse(raw(current)) },
  { status: 204, data: raw(current) },
  { status: 200, data: raw(current).replace(entry, id) },
  {
    status: 200,
    data: raw(current).replace('"expires_at":null', '"expires_at":null,"removal_token":null'),
  },
  { status: 200, data: raw(current).replace(String(current), `"${current}"`) },
])('rejects stale, malformed or token-bearing preview response %#', async (response) => {
  api.get.mockResolvedValueOnce(response);
  await expect(service.preview(id, entry)).rejects.toThrow();
});
test.each([raw(current + 1n), raw(current + 2n, true)])(
  'does not report successful DELETE from a wrong receipt %#',
  async (data) => {
    api.delete.mockResolvedValueOnce({ status: 200, data });
    await expect(service.remove(id, entry, current)).rejects.toThrow();
    expect(api.delete).toHaveBeenCalledTimes(1);
  },
);

test('rejects a scope with a trailing newline before making a request', async () => {
  await expect(service.preview(id + '\n', entry)).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
});

test('a stale deletion exposes the safe code but no raw HTTP fields or retry', async () => {
  api.delete.mockRejectedValueOnce({
    config: { data: 'not-surfaced' },
    response: {
      status: 409,
      data: JSON.stringify({ data: { code: 'ranking.entry_state_stale' } }),
    },
  });
  const error = await service.remove(id, entry, current).catch((e) => e);
  expect(error).toMatchObject({
    name: 'RankingEntryRemovalError',
    status: 409,
    code: 'ranking.entry_state_stale',
  });
  expect(error).not.toHaveProperty('config');
  expect(error).not.toHaveProperty('response');
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(api.get).not.toHaveBeenCalled();
});
