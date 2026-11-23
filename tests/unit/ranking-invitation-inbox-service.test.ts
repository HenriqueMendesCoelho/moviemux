import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service from '../../src/modules/ranking/services/RankingInvitationInboxService';
const rank = '11111111-1111-4111-8111-111111111111',
  invite = '22222222-2222-4222-8222-222222222222';
const item = {
  invite_id: invite,
  ranking_id: rank,
  ranking_name: null,
  expires_at: '2026-11-29T12:00:00Z',
};
afterEach(() => vi.resetAllMocks());
test('inbox route accepts only a bounded scoped cursor, projects allowed fields', async () => {
  const signal = new AbortController().signal;
  api.get.mockResolvedValue({
    status: 200,
    data: { items: [{ ...item, private: 'ignored' }], next_cursor: null },
  });
  expect(await service.incoming(invite, signal)).toEqual({ items: [item], next_cursor: null });
  expect(api.get).toHaveBeenCalledWith('/movies/collections/invitations/incoming', {
    params: { limit: 20, after: invite },
    signal,
  });
});
test('malformed recipients, names, expiry or cursor fail closed', async () => {
  await expect(service.incoming('../../private')).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
  for (const bad of [
    { ...item, ranking_name: 1 },
    { ...item, invite_id: 'fake' },
    { ...item, expires_at: 'tomorrow' },
    { ...item, expires_at: '2026-11-29T12:00:00' },
  ]) {
    api.get.mockResolvedValueOnce({ status: 200, data: { items: [bad], next_cursor: null } });
    await expect(service.incoming()).rejects.toThrow();
  }
  api.get.mockResolvedValueOnce({ status: 200, data: { items: [], next_cursor: 'invalid' } });
  await expect(service.incoming()).rejects.toThrow();
});
test('accept performs exactly one bodyless POST and requires 204', async () => {
  api.post.mockResolvedValueOnce({ status: 204 });
  await service.accept(item);
  expect(api.post.mock.calls).toEqual([[`/movies/collections/${rank}/invitations/${invite}/accept`]]);
  api.post.mockResolvedValueOnce({ status: 200, data: { capabilities: ['READ'] } });
  await expect(service.accept(item)).rejects.toThrow();
  await expect(service.accept({ ...item, invite_id: '../invite' })).rejects.toThrow();
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.get).not.toHaveBeenCalled();
});
