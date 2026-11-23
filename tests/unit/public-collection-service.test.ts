import { afterEach, expect, test, vi } from 'vitest';
import service, {
  publicCollectionId,
} from '../../src/modules/ranking/services/PublicCollectionService';
const rank = 'abcdefab-2222-4222-8222-222222222222',
  row = 'cccccccc-2222-4222-8222-222222222222';
function response(raw: string, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(
        async () => new Response(raw, { status, headers: { 'content-type': 'application/json' } }),
      ),
  );
}
afterEach(() => vi.unstubAllGlobals());
test('browser uses only anonymous same-origin GET, no auth/actor or persistent cache', async () => {
  response(`{"ranking_name":null,"ranking_id":"${rank}"}`);
  const signal = new AbortController().signal;
  expect(await service.summary(rank, signal)).toEqual({ ranking_id: rank, ranking_name: null });
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/public/movies/collections/' + rank, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    headers: { accept: 'application/json' },
    signal,
  });
});
test('validation never lowercases a URL, forwards a route/query escape or noncanonical cursor', async () => {
  response('{}');
  for (const invalid of [rank.toUpperCase(), rank + '?x=1', '../private', null, [rank]]) {
    expect(publicCollectionId(invalid)).toBeNull();
    await expect(service.summary(invalid as string)).rejects.toMatchObject({ status: 404 });
  }
  await expect(service.entries(rank, '../private')).rejects.toMatchObject({ status: 502 });
  expect(fetch).not.toHaveBeenCalled();
});
test('exact BigInt signed integer tokens preserve decades of data and title nullability', async () => {
  response(
    `{"items":[{"entry_id":"${row}","title":null,"total":-90071992547409931,"votes":9007199254740995}],"next_cursor":null}`,
  );
  const signal = new AbortController().signal;
  expect(await service.entries(rank, rank, signal)).toEqual({
    items: [{ entry_id: row, title: null, total: -90071992547409931n, votes: 9007199254740995n }],
    next_cursor: null,
  });
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    '/api/public/movies/collections/' + rank + '/entries?limit=20&after=' + rank,
    expect.objectContaining({ signal, credentials: 'omit', cache: 'no-store' }),
  );
});
test.each([
  `{"items":[{"entry_id":"${row}","title":null,"total":0,"votes":0,"partial":true}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${row}","title":null,"total":4,"votes":0}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${row}","title":null,"total":0,"votes":1e2}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${rank}","title":null,"total":0,"votes":0}],"next_cursor":null}`,
  `{"items":[{"entry_id":"${row}","title":null,"total":0,"votes":0}],"next_cursor":"${row}"}`,
  `{"items":[{"entry_id":"${row}","title":null,"total":0,"votes":0}{"entry_id":"dddddddd-2222-4222-8222-222222222222","title":null,"total":0,"votes":0}],"next_cursor":null}`,
])('malformed or private response ignored', async (raw) => {
  response(raw);
  await expect(service.entries(rank, rank)).rejects.toMatchObject({ status: 502 });
});
