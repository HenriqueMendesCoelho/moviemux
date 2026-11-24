import { COLLECTIONS_PATH } from './collection-browser-paths';

const legacyBoardPages = new Set(['home', 'add', 'movie-charts', 'movie-edit']);
const editPath =
  /^\/movie\/edit\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;

export function isLegacyBoardPage(name: unknown): boolean {
  return typeof name === 'string' && legacyBoardPages.has(name);
}

export function isLegacyBoardPath(pathname: string): boolean {
  return (
    pathname === '/home' ||
    pathname === '/movie/add' ||
    pathname === '/movie/dashboard' ||
    editPath.test(pathname)
  );
}

export function signedInMovieLanding(legacyBoardAvailable: boolean): string {
  return legacyBoardAvailable ? '/home' : COLLECTIONS_PATH;
}
