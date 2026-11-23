import { afterEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service, {
  isTmdbPickerPoster,
  pickerQuery,
} from '../../src/modules/ranking/services/RankingTmdbPickerService';
const rank = '11111111-1111-4111-8111-111111111111',
  entry = '22222222-2222-4222-8222-222222222222';
const path = `/movies/collections/${rank}/entries/tmdb`;
const item = {
  tmdb_id: 13,
  title: 'Movie',
  original_title: null,
  release_date: '2024-01-23',
  poster_path: '/safe.jpg',
};
afterEach(() => vi.resetAllMocks());
test('default flag and invalid scoped request fail before any POST', async () => {
  await expect(service.search(rank, 'movie', 1, 'en-US')).rejects.toThrow();
  await expect(service.add(rank, 13)).rejects.toThrow();
  await expect(service.search('../else', 'movie', 1, 'en-US', true)).rejects.toThrow();
  for (const page of [0, 21, 1.5])
    await expect(service.search(rank, 'movie', page, 'en-US', true)).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
});
test('exact searchable Unicode length and JSON only, never includes query in URL', async () => {
  expect(pickerQuery(' 💡 ')).toBeNull();
  expect(pickerQuery(' 💡💡 ')).toBe('💡💡');
  expect(pickerQuery('A'.repeat(121))).toBeNull();
  const signal = new AbortController().signal;
  api.post.mockResolvedValueOnce({ status: 200, data: { items: [item], page: 2, has_more: true } });
  expect(await service.search(rank, '  X?& # ', 2, 'pt-BR', true, signal)).toEqual({
    items: [item],
    page: 2,
    has_more: true,
  });
  expect(api.post.mock.calls).toEqual([
    [path + '/search', { query: 'X?& #', page: 2, language: 'pt-BR' }, { signal }],
  ]);
});
test.each([
  'https://evil.test/a.jpg',
  '//host.jpg',
  '/a/b.jpg',
  '/hi.jpg?q=x',
  '/pic.avif',
  '/pic.PNG',
  '/../a.jpg',
  '/pic%2F.jpg',
])('unsafe poster path %s rejected', (input) => expect(isTmdbPickerPoster(input)).toBe(false));
test('invalid item, timestamp, score leakage, or incoherent page rejects response', async () => {
  for (const data of [
    { items: [{ ...item, title: '  ' }], page: 1, has_more: false },
    { items: [{ ...item, release_date: '2024-02-30' }], page: 1, has_more: false },
    { items: [{ ...item, tmdb_id: Number.MAX_SAFE_INTEGER + 1 }], page: 1, has_more: false },
    { items: [{ ...item, score: 7 }], page: 1, has_more: false },
    { items: [item], page: 1, has_more: false, total: 1 },
    { items: [], page: 1, has_more: true },
    { items: [item], page: 2, has_more: false },
    { items: Array(21).fill(item), page: 1, has_more: false },
  ]) {
    api.post.mockResolvedValueOnce({ status: 200, data });
    await expect(service.search(rank, 'movie', 1, 'en-US', true)).rejects.toThrow();
  }
});
test('canonical import separate body and 200/201 distinction', async () => {
  api.post
    .mockResolvedValueOnce({ status: 201, data: { entry_id: entry } })
    .mockResolvedValueOnce({ status: 200, data: { entry_id: entry } });
  expect(await service.add(rank, 13, true)).toEqual({ entryId: entry, disposition: 'new' });
  expect(await service.add(rank, 13, true)).toEqual({ entryId: entry, disposition: 'existing' });
  expect(api.post.mock.calls).toEqual([
    [path, { tmdb_id: 13 }],
    [path, { tmdb_id: 13 }],
  ]);
  api.post.mockResolvedValueOnce({ status: 202, data: { entry_id: entry } });
  await expect(service.add(rank, 13, true)).rejects.toThrow();
});
