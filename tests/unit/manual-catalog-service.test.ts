import { beforeEach, expect, test, vi } from 'vitest';
const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: transport }));
import service, {
  ManualCatalogError,
  normalizeManualCatalogInput,
} from '../../src/modules/movie/services/ManualCatalogService';
const route = '/restricted/movies/catalog/manual';
const id = 'aaaaaaaa-1111-4111-8111-111111111111';
const movie = 'bbbbbbbb-2222-4222-8222-222222222222';
const input = {
  command_id: id,
  original_title: ' Manual 🎬 ',
  release_date: '0001-01-01',
  genre_ids: [4, 2],
};
beforeEach(() => vi.resetAllMocks());
test('proof accepts only exact empty 204, scoped signal and no write', async () => {
  const signal = new AbortController().signal;
  transport.get.mockResolvedValueOnce({ status: 204, data: '' });
  await expect(service.proof(signal)).resolves.toBeUndefined();
  expect(transport.get).toHaveBeenCalledExactlyOnceWith(route, { signal });
  transport.get.mockResolvedValueOnce({ status: 200, data: {} });
  await expect(service.proof(signal)).rejects.toBeInstanceOf(ManualCatalogError);
  expect(transport.post).not.toHaveBeenCalled();
});
test.each([201, 200])(
  'explicit create preserves caller intent, no follow-up after receipt %s',
  async (status) => {
    transport.post.mockResolvedValueOnce({ status, data: { movie_id: movie } });
    await expect(service.create(input)).resolves.toEqual({ movie_id: movie });
    expect(transport.post).toHaveBeenCalledExactlyOnceWith(
      route,
      normalizeManualCatalogInput(input),
    );
    expect(transport.post.mock.calls[0]?.[1]).toMatchObject({
      command_id: id,
      original_title: 'Manual 🎬',
      genre_ids: [2, 4],
      release_date: '0001-01-01',
    });
    expect(transport.get).not.toHaveBeenCalled();
  },
);
test('malformed success does not retry and safe denial does not leak configuration or identity', async () => {
  transport.post.mockResolvedValueOnce({ status: 201, data: { movie_id: movie, user_id: id } });
  await expect(service.create(input)).rejects.toBeInstanceOf(ManualCatalogError);
  expect(transport.post).toHaveBeenCalledTimes(1);
  transport.post.mockRejectedValueOnce({
    response: {
      status: 409,
      data: { data: { code: 'catalog.manual_command_conflict' }, email: 'hidden' },
    },
    config: { data: input },
  });
  const e = await service.create(input).catch((e) => e);
  expect(e).toMatchObject({ status: 409, code: 'catalog.manual_command_conflict' });
  expect(e).not.toHaveProperty('config');
  expect(e).not.toHaveProperty('response');
  expect(transport.post).toHaveBeenCalledTimes(2);
});
test('does not invent a title, date, runtime, ID or reference', async () => {
  await expect(service.create({ command_id: id })).rejects.toMatchObject({ status: 400 });
  await expect(service.create({ ...input, command_id: '' })).rejects.toMatchObject({ status: 400 });
  await expect(service.create({ ...input, runtime: 0 })).rejects.toMatchObject({ status: 400 });
  expect(transport.post).not.toHaveBeenCalled();
  expect(
    normalizeManualCatalogInput({
      command_id: id,
      original_title: '🎬'.repeat(150),
      description: '🎬'.repeat(4000),
    }),
  ).toMatchObject({
    release_date: null,
    runtime: null,
    genre_ids: [],
  });
});
