import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import roster, {
  RankingOwnerRosterError,
  ROSTER_CAPABILITIES,
} from '../../src/modules/ranking/services/RankingOwnerRosterService';
const rank = 'abcdefab-2222-4222-8222-222222222222';
const member = '8abcdefa-3333-4333-8333-333333333333';
const after = '7abcdefa-4444-4444-8444-444444444444';
const route = `/movies/collections/${rank}/members`;
const item = { membership_id: member, display_name: null, capabilities: ['READ'] };
const page = { items: [item], next_cursor: null };
beforeEach(() => vi.resetAllMocks());

test('fresh private roster call takes scoped cursor and never performs an unrelated request', async () => {
  const signal = new AbortController().signal;
  api.get.mockResolvedValueOnce({ status: 200, data: page });
  await expect(roster.list(rank.toUpperCase(), after, signal)).resolves.toEqual(page);
  expect(api.get).toHaveBeenCalledExactlyOnceWith(route, { params: { after, limit: 20 }, signal });
  expect(api.put).not.toHaveBeenCalled();
});
test('empty and complete grant sets are exact contextual replacements', async () => {
  api.put.mockResolvedValue({ status: 204, data: '' });
  await expect(roster.replaceCapabilities(rank, member, [])).resolves.toBeUndefined();
  expect(api.put).toHaveBeenLastCalledWith(route + '/by-membership/' + member + '/capabilities', {
    capabilities: [],
  });
  await expect(
    roster.replaceCapabilities(rank, member, ROSTER_CAPABILITIES),
  ).resolves.toBeUndefined();
  expect(api.put).toHaveBeenLastCalledWith(route + '/by-membership/' + member + '/capabilities', {
    capabilities: ROSTER_CAPABILITIES,
  });
  expect(api.get).not.toHaveBeenCalled();
});
test('losing scope emits only safe status/code and does not attempt fallback or retry', async () => {
  api.put.mockRejectedValueOnce({
    response: { status: 404, data: { data: { code: 'ranking.not_found' }, login: 'secret' } },
    config: { data: 'secret' },
  });
  const error = await roster.replaceCapabilities(rank, member, ['READ']).catch((error) => error);
  expect(error).toMatchObject({ status: 404, code: 'ranking.not_found' });
  expect(error).not.toHaveProperty('config');
  expect(error).not.toHaveProperty('response');
  expect(api.put).toHaveBeenCalledTimes(1);
  expect(api.get).not.toHaveBeenCalled();
});
test('rejects unknown grants, non-UUID cursor and nonempty write response', async () => {
  await expect(roster.replaceCapabilities(rank, member, ['ADM' as 'READ'])).rejects.toBeInstanceOf(
    RankingOwnerRosterError,
  );
  await expect(roster.list(rank, 'account-email')).rejects.toBeInstanceOf(RankingOwnerRosterError);
  expect(api.put).not.toHaveBeenCalled();
  expect(api.get).not.toHaveBeenCalled();
  api.put.mockResolvedValueOnce({ status: 204, data: { capabilities: ['READ'] } });
  await expect(roster.replaceCapabilities(rank, member, ['READ'])).rejects.toBeInstanceOf(
    RankingOwnerRosterError,
  );
});
test('rejects overdisclosure and redacts an email-shaped label', async () => {
  api.get.mockResolvedValueOnce({
    status: 200,
    data: { ...page, items: [{ ...item, account_id: member }] },
  });
  await expect(roster.list(rank)).rejects.toBeInstanceOf(RankingOwnerRosterError);
  api.get.mockResolvedValueOnce({
    status: 200,
    data: { ...page, items: [{ ...item, display_name: 'private@example.invalid' }] },
  });
  await expect(roster.list(rank)).resolves.toEqual(page);
});
