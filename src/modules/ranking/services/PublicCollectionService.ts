const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const canonical = new RegExp(`^${uuid}$`);
export function publicCollectionId(value: unknown): string | null {
  return typeof value === 'string' && canonical.test(value) ? value : null;
}
export interface PublicCollectionSummary {
  ranking_id: string;
  ranking_name: string | null;
}
export interface PublicCollectionEntry {
  entry_id: string;
  title: string | null;
  total: bigint;
  votes: bigint;
}
export interface PublicCollectionPage {
  items: PublicCollectionEntry[];
  next_cursor: string | null;
}
export class PublicCollectionError extends Error {
  constructor(readonly status: number) {
    super('Public collection request failed');
  }
}
function invalid(): never {
  throw new PublicCollectionError(502);
}

const SAFE_CONTENT_LIMIT = 256 * 1024;
async function request(id: string, suffix: string, signal?: AbortSignal) {
  if (!publicCollectionId(id)) throw new PublicCollectionError(404);
  const response = await fetch(`/api/public/movies/collections/${id}${suffix}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    headers: { accept: 'application/json' },
    signal,
  });
  if (response.status !== 200) throw new PublicCollectionError(response.status);
  if (
    response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  )
    return invalid();
  const reader = response.body?.getReader();
  if (!reader) return invalid();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let raw = '',
    bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > SAFE_CONTENT_LIMIT) {
      await reader.cancel();
      return invalid();
    }
    raw += decoder.decode(value, { stream: true });
  }
  return raw + decoder.decode();
}
function exact(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key))
  )
    return invalid();
  return value as Record<string, unknown>;
}
function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
// This is the dedicated BFF's canonical minimal wire encoding, not provider JSON.
// Lex the two integers as text so even browsers without JSON reviver source
// support never round the raw score sum or count through Number.
const jsonString = String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
const integer = '(?:0|-?[1-9][0-9]*)';
const row = new RegExp(
  `\\{"entry_id":"(${uuid})","title":(null|${jsonString}),"total":(${integer}),"votes":(${integer})\\}`,
  'y',
);
const trailer = new RegExp(`^\\],"next_cursor":(null|"${uuid}")\\}$`);
function parsePage(raw: string, after: string | null): PublicCollectionPage {
  const start = '{"items":[';
  if (!raw.startsWith(start)) return invalid();
  const entries: PublicCollectionEntry[] = [];
  const entry = new RegExp(row.source, 'y');
  let current = start.length,
    previous = after;
  while (raw[current] === '{') {
    entry.lastIndex = current;
    const m = entry.exec(raw);
    if (!m?.[1] || !m[2] || !m[3] || !m[4] || entries.length >= 20) return invalid();
    const entry_id = m[1],
      title = JSON.parse(m[2]) as string | null;
    const total = BigInt(m[3]),
      votes = BigInt(m[4]);
    if ((previous !== null && entry_id <= previous) || votes < 0n || (votes === 0n && total !== 0n))
      return invalid();
    entries.push({ entry_id, title, total, votes });
    previous = entry_id;
    current = entry.lastIndex;
    if (raw[current] === ',') {
      current++;
      if (raw[current] !== '{') return invalid();
    } else if (raw[current] !== ']') return invalid();
  }
  const cursor = trailer.exec(raw.slice(current))?.[1];
  if (!cursor) return invalid();
  const next_cursor = JSON.parse(cursor) as string | null;
  if (next_cursor !== null && (entries.length !== 20 || previous !== next_cursor)) return invalid();
  return { items: entries, next_cursor };
}
export default {
  async summary(id: string, signal?: AbortSignal): Promise<PublicCollectionSummary> {
    const raw = await request(id, '', signal);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return invalid();
    }
    const value = exact(data, ['ranking_id', 'ranking_name']);
    if (value.ranking_id !== id || !nullableText(value.ranking_name)) return invalid();
    return { ranking_id: id, ranking_name: value.ranking_name };
  },
  async entries(
    id: string,
    after: string | null = null,
    signal?: AbortSignal,
  ): Promise<PublicCollectionPage> {
    if (after !== null && !publicCollectionId(after)) return invalid();
    const query = new URLSearchParams({ limit: '20' });
    if (after !== null) query.set('after', after);
    return parsePage(await request(id, `/entries?${query}`, signal), after);
  },
};
