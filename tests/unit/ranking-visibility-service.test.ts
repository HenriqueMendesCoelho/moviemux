import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service from '../../src/modules/ranking/services/RankingVisibilityService';

const id = 'abcdefab-2222-4222-8222-222222222222';
const path = `/movies/collections/${id}/settings/visibility`;
beforeEach(() => vi.resetAllMocks());

test('uses canonical bodyless GET and explicit desired PUT only', async () => {
  const signal = new AbortController().signal;
  api.get.mockResolvedValue({ status: 200, data: { visibility: 'PRIVATE' } });
  api.put.mockResolvedValue({ status: 200, data: { visibility: 'PUBLIC' } });
  await expect(service.settings(id.toUpperCase(), signal)).resolves.toBe('PRIVATE');
  await expect(service.save(id, 'PUBLIC')).resolves.toBe('PUBLIC');
  expect(api.get).toHaveBeenCalledExactlyOnceWith(path, { signal });
  expect(api.put).toHaveBeenCalledExactlyOnceWith(path, { visibility: 'PUBLIC' });
});
test.each([
  { status: 204, data: { visibility: 'PUBLIC' } },
  { status: 200, data: { visibility: 'PUBLIC', title: 'unexpected' } },
  { status: 200, data: { visibility: null } },
  { status: 200, data: [] },
])('rejects a malformed or old GET payload %#', async (response) => {
  api.get.mockResolvedValue(response);
  await expect(service.settings(id)).rejects.toThrow();
});
test('bad scope fails closed and mismatched desired receipt is rejected', async () => {
  await expect(service.settings('invalid')).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
  api.put.mockResolvedValue({ status: 200, data: { visibility: 'PRIVATE' } });
  await expect(service.save(id, 'PUBLIC')).rejects.toThrow();
  expect(api.put).toHaveBeenCalledTimes(1);
});
