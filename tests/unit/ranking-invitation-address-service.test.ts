import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service, {
  isInvitationAddress,
} from '../../src/modules/ranking/services/RankingInvitationService';
const path = '/user/ranking-invitation-address',
  code = 'aX-_AbCdefGhijkLMNopqQ';
afterEach(() => vi.resetAllMocks());
test('canonical 16-byte base64url only; preserve case and never trim or normalize', () => {
  expect(isInvitationAddress(code)).toBe(true);
  for (const bad of [
    code + '=',
    code + '\n',
    ' ' + code,
    code.slice(0, -1) + 'R',
    code.replace('_', '/'),
    code.slice(1),
    null,
    123,
  ])
    expect(isInvitationAddress(bad)).toBe(false);
});
test('authenticated get projects only exact code or explicit null, no mutation', async () => {
  const signal = new AbortController().signal;
  api.get.mockResolvedValueOnce({ status: 200, data: { recipient_code: null } });
  api.get.mockResolvedValueOnce({
    status: 200,
    data: { recipient_code: code, internal: 'ignored' },
  });
  expect(await service.readAddress(signal)).toBeNull();
  expect(await service.readAddress(signal)).toBe(code);
  expect(api.get).toHaveBeenCalledWith(path, { signal });
  expect(api.post).not.toHaveBeenCalled();
});
test('rotate has no submitted body and requires successful exact status and valid nonnull code', async () => {
  api.post.mockResolvedValueOnce({ status: 200, data: { recipient_code: code } });
  expect(await service.rotateAddress()).toBe(code);
  expect(api.post.mock.calls).toEqual([[`${path}/rotate`]]);
  for (const bad of [
    { status: 201, data: { recipient_code: code } },
    { status: 200, data: { recipient_code: null } },
    { status: 200, data: { recipient_code: 'secret text' } },
  ]) {
    api.post.mockResolvedValueOnce(bad);
    await expect(service.rotateAddress()).rejects.toThrow();
  }
  expect(api.get).not.toHaveBeenCalled();
});
