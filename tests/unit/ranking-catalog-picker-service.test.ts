import { beforeEach, expect, test, vi } from 'vitest';
const axios = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: axios }));
import picker, {
  catalogPickerQuery,
  CatalogPickerError,
} from '../../src/modules/ranking/services/RankingCatalogPickerService';
const rank = 'aaaaaaaa-1111-4111-8111-111111111111';
const movie = 'bbbbbbbb-2222-4222-8222-222222222222';
const entry = 'cccccccc-3333-4333-8333-333333333333';
const route = `/movies/collections/${rank}/entries/catalog`;
const film = { movie_id: movie, title: 'Filme manual', release_date: null };
const page = { items: [film], page: 1, has_more: false };
beforeEach(() => vi.resetAllMocks());
test('scoped internal search sends literal trimmed query only; no fallback', async () => {
  const signal = new AbortController().signal;
  axios.post.mockResolvedValueOnce({ status: 200, data: page });
  await expect(picker.search(rank, ' 100%_🎬 ', 1, 'pt-BR', signal)).resolves.toEqual(page);
  expect(axios.post).toHaveBeenCalledExactlyOnceWith(
    route + '/search',
    { query: '100%_🎬', page: 1, language: 'pt-BR' },
    { signal },
  );
});
test('keeps Java whitespace and surrogate semantics', () => {
  expect(catalogPickerQuery('\u001d tt\u202f')).toBe('tt');
  expect(catalogPickerQuery('\ufefft')).toBe('\ufefft');
  expect(catalogPickerQuery('t\ud800t')).toBeNull();
  expect(catalogPickerQuery('a\u0085b')).toBeNull();
  expect(catalogPickerQuery('🎬'.repeat(120))).toBe('🎬'.repeat(120));
});
test.each([200, 201])(
  'attach by canonical movie identity requires exact receipt, status %s',
  async (status) => {
    axios.post.mockResolvedValueOnce({ status, data: { entry_id: entry } });
    await expect(picker.add(rank, movie)).resolves.toEqual({
      entryId: entry,
      disposition: status === 201 ? 'new' : 'existing',
    });
    expect(axios.post).toHaveBeenCalledExactlyOnceWith(route, { movie_id: movie });
  },
);
test('unknown response never starts another request or claims attachment', async () => {
  axios.post.mockResolvedValueOnce({
    status: 201,
    data: { entry_id: entry, metadata: 'not allowed' },
  });
  await expect(picker.add(rank, movie)).rejects.toBeInstanceOf(CatalogPickerError);
  expect(axios.post).toHaveBeenCalledTimes(1);
});
test('invalid requests and inaccessible catalogs do not try TMDB or global discovery', async () => {
  await expect(picker.search(rank, '🎬', 1, 'en-US')).rejects.toMatchObject({ status: 400 });
  await expect(picker.add(rank, movie + '\n')).rejects.toMatchObject({ status: 400 });
  expect(axios.post).not.toHaveBeenCalled();
  axios.post.mockRejectedValueOnce({
    response: { status: 404, data: { data: { code: 'ranking.not_found' }, private: 'scope' } },
    config: { data: 'query' },
  });
  const e = await picker.search(rank, 'movie', 1, 'en-US').catch((e) => e);
  expect(e).toMatchObject({ status: 404, code: 'ranking.not_found' });
  expect(e).not.toHaveProperty('config');
  expect(e).not.toHaveProperty('response');
  expect(axios.post).toHaveBeenCalledTimes(1);
});
