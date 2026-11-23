import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service, {
  rankingSummary,
  validRankingName,
} from '../../src/modules/ranking/services/RankingService';
const id = '11111111-1111-4111-8111-111111111111';
const summary = {
  ranking_id: id,
  name: null,
  visibility: 'PRIVATE',
  admission: 'INVITATION',
  capabilities: ['READ'],
};
beforeEach(() => vi.clearAllMocks());
test('validates Unicode code points and trimmed input without translating user text', () => {
  expect(validRankingName('   ')).toBe(false);
  expect(validRankingName('😀'.repeat(120))).toBe(true);
  expect(validRankingName('😀'.repeat(121))).toBe(false);
});
test('requests bounded authenticated page and keeps null names and snake_case wire fields', async () => {
  api.get.mockResolvedValue({ data: { items: [summary], next_cursor: null } });
  const signal = new AbortController().signal;
  expect(await service.list(id, signal)).toEqual({ items: [summary], next_cursor: null });
  expect(api.get).toHaveBeenCalledWith('/rankings', { params: { limit: 20, after: id }, signal });
});
test('does not accept arbitrary path/cursor or malformed scope projections', async () => {
  await expect(service.list('../movie')).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
  expect(() => rankingSummary({ ...summary, ranking_id: 'wrong' })).toThrow();
  expect(() => rankingSummary({ ...summary, capabilities: [true] })).toThrow();
  api.get.mockResolvedValue({ data: { items: [], next_cursor: '/movie' } });
  await expect(service.list()).rejects.toThrow();
});
test('creates only requested fields, requires 201 and never supplies owner/grants', async () => {
  api.post.mockResolvedValue({ status: 201, data: { ...summary, name: 'Cinema' } });
  expect(
    await service.create({ name: '  Cinema  ', visibility: 'PRIVATE', admission: 'INVITATION' }),
  ).toMatchObject({ name: 'Cinema' });
  expect(api.post).toHaveBeenCalledWith('/rankings', {
    name: 'Cinema',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
  });
  api.post.mockResolvedValue({ status: 200, data: summary });
  await expect(
    service.create({ name: 'Cinema', visibility: 'PRIVATE', admission: 'INVITATION' }),
  ).rejects.toThrow();
});
