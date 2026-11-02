import { beforeEach, expect, test, vi } from 'vitest';
import MovieService from '../MovieService';
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('src/core/http', () => ({ default: http }));
beforeEach(() => vi.resetAllMocks());

test.each([1, 3])(
  'empty Spring204 collection returns an empty page for request page %i',
  async (page) => {
    http.get.mockResolvedValue({ status: 204, data: '' });
    const result = await MovieService.listMoviesPageable({ page, size: 8, title: 'missing' });
    expect(result).toMatchObject({
      content: [],
      empty: true,
      last: true,
      first: page === 1,
      total_elements: 0,
      total_pages: 0,
      size: 8,
      number: page - 1,
      number_of_elements: 0,
      pageable: { page_number: page - 1, page_size: 8, offset: (page - 1) * 8 },
    });
    expect(http.get).toHaveBeenCalledWith(
      `/movie?sort=portugueseTitle,asc&title=missing&page=${page}&size=8`,
    );
    expect(result.content.filter(() => true)).toEqual([]);
  },
);
test('nonempty200 pageable payload remains unchanged', async () => {
  const data = {
    content: [{ id: 'film', portuguese_title: 'Filme' }],
    total_pages: 1,
    total_elements: 1,
    number_of_elements: 1,
  };
  http.get.mockResolvedValue({ status: 200, data });
  expect(await MovieService.listMoviesPageable({})).toBe(data);
});
test.each(['getMoviesGenres', 'getMoviesGenresWithMovies'] as const)(
  '%s normalizes204 and preserves200 arrays',
  async (method) => {
    http.get.mockResolvedValueOnce({ status: 204, data: '' });
    expect(await MovieService[method]()).toEqual([]);
    const data = [{ id: 1, tmdb_id: 28, name: 'Ação' }];
    http.get.mockResolvedValueOnce({ status: 200, data });
    expect(await MovieService[method]()).toBe(data);
  },
);
test('missing individual204 movie rejects instead of fabricating an empty record', async () => {
  http.get.mockResolvedValueOnce({ status: 204, data: '' });
  await expect(MovieService.getMovie('missing')).rejects.toThrow('Movie not found');
  const data = { id: 'film', portuguese_title: 'Filme' };
  http.get.mockResolvedValueOnce({ status: 200, data });
  expect(await MovieService.getMovie('film')).toBe(data);
});
test('single updated note DTO and rating zero remain intact', async () => {
  const data = {
    note: 0,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-11-02T02:00:00Z',
    user: { id: 'owner', name: 'Henrique' },
  };
  http.patch.mockResolvedValue({ status: 200, data });
  expect(await MovieService.updateMovieNotes(0, 'film')).toBe(data);
  expect(http.patch).toHaveBeenCalledWith('/movie/note/film/update', { note: 0 });
  http.post.mockResolvedValue({ status: 200, data });
  expect(await MovieService.createMovieNote(0, 'film')).toBe(data);
  expect(http.post).toHaveBeenCalledWith('/movie/note', { movie_id: 'film', note: 0 });
});
test('backend empty200 delete responses resolve void', async () => {
  http.delete.mockResolvedValue({ status: 200, data: '' });
  expect(await MovieService.deleteMovieNotes('film')).toBeUndefined();
  expect(await MovieService.deleteMovie('film')).toBeUndefined();
});
