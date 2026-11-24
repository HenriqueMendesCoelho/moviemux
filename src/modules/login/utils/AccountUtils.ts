import { collectionSignInReturnPath } from '~/core/collection-browser-paths';
import { isLegacyBoardPath, signedInMovieLanding } from '~/core/legacy-board-retirement';

/** Accept only local route paths, never protocol-relative or browser-normalized hosts. */
export function safeReturnPath(value: unknown, legacyBoardAvailable = true): string {
  const fallback = signedInMovieLanding(legacyBoardAvailable);
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return fallback;
  const pathname = value.split(/[?#]/, 1)[0];
  if (!legacyBoardAvailable && pathname && isLegacyBoardPath(pathname)) return fallback;
  return (pathname && collectionSignInReturnPath(pathname)) || value;
}
