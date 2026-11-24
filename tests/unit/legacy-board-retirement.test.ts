import { expect, test } from 'vitest';
import { COLLECTIONS_PATH } from '~/core/collection-browser-paths';
import {
  isLegacyBoardPage,
  isLegacyBoardPath,
  signedInMovieLanding,
} from '~/core/legacy-board-retirement';
import { safeReturnPath } from '~/modules/login/utils/AccountUtils';

const id = '00000000-0000-0000-0000-000000000001';

test.each([
  ['/home', 'home'],
  ['/movie/add', 'add'],
  ['/movie/dashboard', 'movie-charts'],
  [`/movie/edit/${id}`, 'movie-edit'],
])('retirement recognizes only the existing board page %s', (path, name) => {
  expect(isLegacyBoardPath(path)).toBe(true);
  expect(isLegacyBoardPage(name)).toBe(true);
  expect(safeReturnPath(path + '?ignored=value#ignored', false)).toBe(COLLECTIONS_PATH);
  expect(safeReturnPath(path + '?kept=value#kept')).toBe(path + '?kept=value#kept');
});

test.each([
  ['/movie/discover', 'movie-discover'],
  ['/movie/watchlist', 'movie-watchlist-list'],
  [`/movie/watchlist/${id}`, 'movie-watchlist-id'],
  [`/movie/${id}`, 'movie'],
  ['/movies/collections', 'rankings'],
  ['/adm', 'adm'],
  ['/api/movie/add', 'unknown'],
  ['/movie/genres', undefined],
  ['/movie/edit/not-a-uuid', Symbol('unknown')],
  [`/movie/edit/${id}/extra`, undefined],
])('does not add a routing wildcard to %s', (path, name) => {
  expect(isLegacyBoardPath(path)).toBe(false);
  expect(isLegacyBoardPage(name)).toBe(false);
});

test('post-cutover login keeps Discover/watchlists/ADM and canonical safe invite-link returns', () => {
  expect(signedInMovieLanding(true)).toBe('/home');
  expect(signedInMovieLanding(false)).toBe(COLLECTIONS_PATH);
  expect(safeReturnPath(undefined)).toBe('/home');
  expect(safeReturnPath(undefined, false)).toBe(COLLECTIONS_PATH);
  expect(safeReturnPath('//outside.example', false)).toBe(COLLECTIONS_PATH);
  expect(safeReturnPath('/movie/discover?movie=123', false)).toBe('/movie/discover?movie=123');
  expect(safeReturnPath(`/movie/watchlist/${id}`, false)).toBe(`/movie/watchlist/${id}`);
  expect(safeReturnPath(`/movie/${id}`, false)).toBe(`/movie/${id}`);
  expect(safeReturnPath('/adm', false)).toBe('/adm');
  expect(safeReturnPath(`/rankings/${id}/join?ignored=1`, false)).toBe(
    `${COLLECTIONS_PATH}/${id}/join`,
  );
});
