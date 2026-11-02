import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import MovieWatchlistService from 'src/modules/movie-watchlist/services/MovieWatchlistService';
import { useMovieWatchlistStore } from 'src/modules/movie-watchlist/stores/MovieWatchlistStore';
import { useUserStore } from 'src/core/stores/UserStore';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('src/core/http', () => ({ default: http }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showError: vi.fn() }));
const emptyResponse = () => ({
  id: 'list-a',
  name: 'Empty list',
  shareable: false,
  user: { id: 'owner', name: 'Owner' },
  created_at: new Date(),
  updated_at: new Date(),
});

beforeEach(() => {
  vi.resetAllMocks();
  setActivePinia(createPinia());
  Object.assign(useUserStore().user, { id: 'owner', isLoged: true });
});

describe('wishlist API omitted-array contract', () => {
  it('normalizes listed empty lists so first membership add can run', async () => {
    http.get.mockResolvedValue({ data: [emptyResponse()] });
    http.patch.mockResolvedValue({
      data: { ...emptyResponse(), movies_wishlists: [{ tmdb_id: 42 }] },
    });
    const store = useMovieWatchlistStore();
    expect(await store.getWatchlists()).toBe(true);
    expect(store.watchlists[0]?.movies_wishlists).toEqual([]);
    expect(await store.addMovie('list-a', 42)).toBe(true);
    expect(http.patch).toHaveBeenCalledWith('/user/wishlist/list-a', 'tmdbId=42');
    expect(store.watchlists[0]?.movies_wishlists).toEqual([{ tmdb_id: 42 }]);
    expect(await store.addMovie('list-a', 42)).toBe(false);
    expect(http.patch).toHaveBeenCalledTimes(1);
  });

  it('normalizes create responses before the new list is added to the store', async () => {
    http.post.mockResolvedValue({ data: emptyResponse() });
    http.patch.mockResolvedValue({ data: emptyResponse() });
    const created = await MovieWatchlistService.createWatchlist('Empty list');
    expect(created.movies_wishlists).toEqual([]);
    const store = useMovieWatchlistStore();
    store.watchlists.push(created);
    expect(await store.addMovie(created.id, 42)).toBe(true);
    expect(store.watchlists[0]?.movies_wishlists).toEqual([]);
  });

  it('normalizes search and update without changing update payloads', async () => {
    http.get.mockResolvedValue({ data: emptyResponse() });
    const found = await MovieWatchlistService.searchWatchlistById('list-a');
    expect(found.movies_wishlists).toEqual([]);
    http.put.mockResolvedValue({ data: { ...emptyResponse(), movies_wishlists: null } });
    expect((await MovieWatchlistService.updateWatchlist(found)).movies_wishlists).toEqual([]);
    expect(http.put).toHaveBeenCalledWith('/user/wishlist/list-a/update', found);
  });

  it.each([undefined, null, '', {}])(
    'rejects missing search entity %s rather than fabricating a list',
    async (data) => {
      http.get.mockResolvedValue({ status: 204, data });
      await expect(MovieWatchlistService.searchWatchlistById('missing')).rejects.toThrow();
    },
  );

  it('treats a collection 204 as no lists', async () => {
    http.get.mockResolvedValue({ status: 204, data: '' });
    expect(await MovieWatchlistService.listWatchlists()).toEqual([]);
  });
});
