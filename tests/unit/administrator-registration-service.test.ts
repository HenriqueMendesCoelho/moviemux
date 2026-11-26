import { beforeEach, expect, test, vi } from 'vitest';
import registration, {
  AdminRegistrationError,
} from '../../src/modules/administrator/services/AdminRegistrationService';
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: http }));
const id = '10000000-0000-4000-8000-000000000001';
const row = {
  request_id: id,
  email: 'requester@example.invalid',
  requested_at: '2026-11-26T01:00:00Z',
  status: 'PENDING',
};
beforeEach(() => vi.resetAllMocks());
test('mode reads are exact and writes require exact normalized receipt', async () => {
  http.get.mockResolvedValue({ status: 200, data: { mode: 'WAITLIST' } });
  expect(await registration.adminMode()).toBe('WAITLIST');
  expect(http.get).toHaveBeenCalledWith('/restricted/registration-mode', { signal: undefined });
  http.put.mockResolvedValue({ status: 200, data: { mode: 'OPEN' } });
  expect(await registration.setAdminMode('OPEN')).toBe('OPEN');
  expect(http.put).toHaveBeenCalledWith(
    '/restricted/registration-mode',
    { mode: 'OPEN' },
    { signal: undefined },
  );
  http.put.mockResolvedValue({ status: 200, data: { mode: 'WAITLIST' } });
  await expect(registration.setAdminMode('OPEN')).rejects.toBeInstanceOf(AdminRegistrationError);
  http.get.mockResolvedValue({ status: 200, data: { mode: 'OPEN', private: true } });
  await expect(registration.adminMode()).rejects.toBeInstanceOf(AdminRegistrationError);
});
test('bounded cursor page and exact allowlisted projection; malformed rows fail closed', async () => {
  http.get.mockResolvedValue({ status: 200, data: { items: [row], next_cursor: null } });
  expect(await registration.adminWaitlist()).toEqual({ items: [row], next_cursor: null });
  expect(http.get).toHaveBeenCalledWith('/restricted/registration-waitlist', {
    params: { limit: 20 },
    signal: undefined,
  });
  const localized = { ...row, email: '𐐀'.repeat(50) + '@example.invalid' };
  http.get.mockResolvedValue({ status: 200, data: { items: [localized], next_cursor: null } });
  expect(await registration.adminWaitlist()).toEqual({ items: [localized], next_cursor: null });
  for (const items of [
    [row, row],
    [{ ...row, status: 'unexpected' }],
    [{ ...row, invite_code: 'KB-12345678' }],
  ]) {
    http.get.mockResolvedValue({ status: 200, data: { items, next_cursor: null } });
    await expect(registration.adminWaitlist()).rejects.toBeInstanceOf(AdminRegistrationError);
  }
  http.get.mockResolvedValue({ status: 200, data: { items: [row], next_cursor: id } });
  await expect(registration.adminWaitlist(id)).rejects.toBeInstanceOf(AdminRegistrationError);
});
test('invite is bodyless and receives only matching exact safe final statuses/code', async () => {
  const receipt = { request_id: id, status: 'DELIVERY_UNKNOWN', invite_code: 'KB-12345678' };
  http.post.mockResolvedValue({ status: 200, data: receipt });
  expect(await registration.inviteWaitlist(id)).toEqual(receipt);
  expect(http.post).toHaveBeenCalledWith(
    `/restricted/registration-waitlist/${id}/invite`,
    undefined,
    { signal: undefined },
  );
  for (const data of [
    { ...receipt, status: 'PENDING' },
    { ...receipt, invite_code: 'bad' },
    { ...receipt, request_id: '10000000-0000-4000-8000-000000000002' },
    { ...receipt, email: row.email },
  ]) {
    http.post.mockResolvedValue({ status: 200, data });
    await expect(registration.inviteWaitlist(id)).rejects.toBeInstanceOf(AdminRegistrationError);
  }
  http.post.mockRejectedValue({ response: { status: 403, data: { message: 'private details' } } });
  await expect(registration.inviteWaitlist(id)).rejects.toEqual(
    expect.objectContaining({
      status: 403,
      message: 'Registration administration unavailable or unconfirmed',
    }),
  );
});

test('reject non-v4 IDs and require a full page with the exact last-row continuation', async () => {
  const items = Array.from({ length: 20 }, (_, i) => ({
    ...row,
    request_id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  }));
  const next_cursor = items.at(-1)!.request_id;
  http.get.mockResolvedValue({ status: 200, data: { items, next_cursor } });
  expect(await registration.adminWaitlist()).toEqual({ items, next_cursor });
  for (const data of [
    { items: items.slice(0, 19), next_cursor: items[18]!.request_id },
    { items, next_cursor: items[0]!.request_id },
    { items: [{ ...row, request_id: '10000000-0000-1000-8000-000000000001' }], next_cursor: null },
  ]) {
    http.get.mockResolvedValue({ status: 200, data });
    await expect(registration.adminWaitlist()).rejects.toBeInstanceOf(AdminRegistrationError);
  }
  await expect(
    registration.inviteWaitlist('10000000-0000-1000-8000-000000000001'),
  ).rejects.toBeInstanceOf(AdminRegistrationError);
  expect(http.post).not.toHaveBeenCalled();
});
