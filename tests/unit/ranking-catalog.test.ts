import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('~/core/http', () => ({ default: api }));
import service, {
  parseAggregate,
  entryTitle,
  entryProjection,
  roundProjection,
} from '../../src/modules/ranking/services/RankingCatalogService';
const id = '11111111-1111-4111-8111-111111111111';
const entry = {
  entry_id: id,
  movie_id: id,
  tmdb_id: null,
  original_title: 'Original',
  english_title: 'English',
  portuguese_title: 'Português',
  url_image: null,
  release_date: null,
  runtime: null,
  created_at: '2026-01-01T00:00:00Z',
};
beforeEach(() => vi.clearAllMocks());
test('exact aggregate integer tokens survive beyond Number precision', () => {
  expect(
    parseAggregate(`{"entry_id":"${id}","total":9007199254740993,"votes":3,"partial":true}`, id),
  ).toEqual({ entry_id: id, total: 9007199254740993n, votes: 3n, partial: true });
  for (const total of ['1.2', '"10"', 'null', 'true'])
    expect(() =>
      parseAggregate(`{"entry_id":"${id}","total":${total},"votes":1,"partial":false}`, id),
    ).toThrow();
  expect(() => parseAggregate({ entry_id: id, total: 10, votes: 1, partial: false }, id)).toThrow();
});
test('projections preserve unknown metadata and reveal state, no incidental score fields', () => {
  expect(entryProjection({ ...entry, score: 10 })).toEqual(entry);
  expect(entryTitle(entry, 'pt-BR', 'Missing')).toBe('Português');
  expect(entryTitle({ ...entry, portuguese_title: null }, 'pt-BR', 'Missing')).toBe('Original');
  expect(
    roundProjection({
      round_id: id,
      number: 1,
      description: null,
      created_at: 'date',
      updated_at: null,
      revealed: null,
    }).revealed,
  ).toBeNull();
  expect(() => roundProjection({ round_id: id, number: 1, revealed: 'true' })).toThrow();
});
test('bounded pages use explicit ranking and entry IDs, reject path injection before request', async () => {
  api.get.mockResolvedValue({ data: { items: [entry], next_cursor: null } });
  expect((await service.entries(id, id)).items).toEqual([entry]);
  expect(api.get).toHaveBeenCalledWith(`/rankings/${id}/entries`, {
    params: { limit: 20, after: id },
    signal: undefined,
  });
  api.get.mockClear();
  await expect(service.rounds(id, '../movie')).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
});
test('own zero/null/legacy integer preserved and wrong scope rejected', async () => {
  for (const score of [0, null, -3, 14]) {
    api.get.mockResolvedValue({ data: { round_id: id, score } });
    expect((await service.ownRating(id, id)).score).toBe(score);
  }
  api.get.mockResolvedValue({ data: { ranking_id: 'wrong', capabilities: ['READ'] } });
  await expect(service.access(id)).rejects.toThrow();
});
test('aggregate requests raw text to avoid default JSON rounding', async () => {
  api.get.mockResolvedValue({ data: `{"entry_id":"${id}","total":0,"votes":0,"partial":false}` });
  expect((await service.aggregate(id, id)).votes).toBe(0n);
  expect(api.get.mock.calls[0][1]).toMatchObject({ responseType: 'text' });
});
test('summary is authorized by exact ranking ID, never inferred from another page', async () => {
  const summary = {
    ranking_id: id,
    name: null,
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ'],
  };
  api.get.mockResolvedValue({ data: summary });
  expect(await service.summary(id)).toEqual(summary);
  expect(api.get).toHaveBeenCalledWith(`/rankings/${id}`, { signal: undefined });
  api.get.mockResolvedValue({
    data: { ...summary, ranking_id: '22222222-2222-4222-8222-222222222222' },
  });
  await expect(service.summary(id)).rejects.toThrow();
});
