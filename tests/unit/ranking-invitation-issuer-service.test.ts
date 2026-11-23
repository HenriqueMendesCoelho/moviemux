import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn(), delete: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import issuer from '../../src/modules/ranking/services/RankingInvitationIssuerService';
const rank = '11111111-1111-4111-8111-111111111111',
  inv = '22222222-2222-4222-8222-222222222222',
  code = 'aX-_AbCdefGhijkLMNopqQ';
const issued = { invite_id: inv, expires_at: '2026-11-29T12:00:00Z' };
afterEach(() => vi.resetAllMocks());
test('exact code only in POST body and exact 201 scoped receipt', async () => {
  api.post.mockResolvedValueOnce({ status: 201, data: { ...issued, internal: 'ignored' } });
  expect(await issuer.issue(rank, code)).toEqual(issued);
  expect(api.post.mock.calls).toEqual([
    [`/movies/collections/${rank}/invitations`, { recipient_code: code }],
  ]);
});
test('fail closed on malformed rank, code, receipt, or success status', async () => {
  await expect(issuer.issue(rank, ' ' + code)).rejects.toThrow();
  await expect(issuer.issue('../wrong', code)).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
  for (const result of [
    { status: 200, data: issued },
    { status: 201, data: { ...issued, invite_id: 'wrong' } },
    { status: 201, data: { ...issued, expires_at: 'today' } },
  ]) {
    api.post.mockResolvedValueOnce(result);
    await expect(issuer.issue(rank, code)).rejects.toThrow();
  }
});
test('revoke takes known IDs, bodyless DELETE and 204 only', async () => {
  api.delete.mockResolvedValueOnce({ status: 204 });
  await issuer.revoke(rank, inv);
  expect(api.delete.mock.calls).toEqual([[`/movies/collections/${rank}/invitations/${inv}`]]);
  await expect(issuer.revoke(rank, 'fake')).rejects.toThrow();
  api.delete.mockResolvedValueOnce({ status: 200 });
  await expect(issuer.revoke(rank, inv)).rejects.toThrow();
  expect(api.delete).toHaveBeenCalledTimes(2);
  expect(api.post).not.toHaveBeenCalled();
});
