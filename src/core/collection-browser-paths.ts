export const COLLECTIONS_PATH = '/movies/collections';
export const PUBLIC_COLLECTIONS_PATH = '/public/movies/collections';

const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const legacyPrivate = new RegExp(`^/rankings/(${uuid})(/join)?$`);
const legacyPublic = new RegExp(`^/public/rankings/(${uuid})$`);

export function legacyCollectionDestination(pathname: string): string | undefined {
  if (pathname.trim() !== pathname) return undefined;
  if (pathname === '/rankings') return COLLECTIONS_PATH;

  const match = legacyPrivate.exec(pathname);
  if (match?.[1]) return `${COLLECTIONS_PATH}/${match[1].toLowerCase()}${match[2] || ''}`;

  const publicId = legacyPublic.exec(pathname)?.[1];
  return publicId ? `${PUBLIC_COLLECTIONS_PATH}/${publicId.toLowerCase()}` : undefined;
}

const canonicalPrivate = new RegExp(`^${COLLECTIONS_PATH}/(${uuid})(/join)?/?$`);

export function collectionSignInReturnPath(pathname: string): string | undefined {
  if (pathname === COLLECTIONS_PATH || pathname === COLLECTIONS_PATH + '/') return COLLECTIONS_PATH;
  const match = canonicalPrivate.exec(pathname);
  if (match?.[1]) return `${COLLECTIONS_PATH}/${match[1].toLowerCase()}${match[2] || ''}`;
  return legacyCollectionDestination(pathname);
}
