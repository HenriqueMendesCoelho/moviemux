import { COLLECTIONS_PATH } from '../../core/collection-browser-paths';

const legacyFilmPrefix = '/movie/';
const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isCanonicalUuid(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && canonicalUuid.test(value);
}

// Match the raw pathname instead of normalizing, decoding or resolving a URL.
export function legacyFilmPathId(requestTarget: string): string | undefined {
  const path = requestTarget.split('?', 1)[0];
  if (!path?.startsWith(legacyFilmPrefix)) return undefined;
  const id = path.slice(legacyFilmPrefix.length);
  return isCanonicalUuid(id) ? id : undefined;
}

export function acceptsHtmlDocument(accept: string | undefined): boolean {
  return Boolean(
    accept?.split(',').some((range) => {
      const [type, ...parameters] = range.split(';').map((part) => part.trim().toLowerCase());
      if (type !== 'text/html') return false;
      const weights = parameters.filter((part) => /^q\s*=/.test(part));
      if (!weights.length) return true;
      if (weights.length !== 1) return false;
      const weight = /^q\s*=\s*([01](?:\.\d{0,3})?)$/.exec(weights[0] || '')?.[1];
      return Number(weight) > 0 && Number(weight) <= 1;
    }),
  );
}

export function legacyFilmMappedLanding(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const record = data as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !Object.hasOwn(record, 'ranking_id') ||
    !Object.hasOwn(record, 'entry_id') ||
    !isCanonicalUuid(record.ranking_id) ||
    !isCanonicalUuid(record.entry_id)
  )
    return undefined;

  return `${COLLECTIONS_PATH}/${record.ranking_id}`;
}
