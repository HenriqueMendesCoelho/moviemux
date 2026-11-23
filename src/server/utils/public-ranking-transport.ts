import { createError } from 'h3';
import { fixedUpstream } from './security';

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const canonical = new RegExp(`^${uuid}$`);
const route = new RegExp(`^/api/public/rankings/(${uuid})(/entries)?$`);
const MAX_RESPONSE_BYTES = 256 * 1024;
type Request = {
  id: string;
  entries: boolean;
  after: string | null;
  limit: number;
  malformed: boolean;
};
function notFound(): never {
  throw createError({
    statusCode: 404,
    statusMessage: 'Collection unavailable',
    data: { code: 'ranking.not_found' },
  });
}
function invalidPage(): never {
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid collection page',
    data: { code: 'ranking.invalid_page' },
  });
}
function unavailable(): never {
  throw createError({ statusCode: 502, statusMessage: 'API unavailable' });
}

export function publicRankingRequest(
  method: string | undefined,
  target: string,
  contentLength?: string,
  transferEncoding?: string,
): Request {
  if (method !== 'GET' || !target || /[#\r\n\t ]/.test(target)) return notFound();
  const mark = target.indexOf('?');
  const path = mark === -1 ? target : target.slice(0, mark);
  const match = route.exec(path);
  if (!match?.[1]) return notFound();

  const parsed: Request = {
    id: match[1],
    entries: Boolean(match[2]),
    after: null,
    limit: 20,
    malformed:
      transferEncoding !== undefined || (contentLength !== undefined && contentLength !== '0'),
  };
  if (mark === -1) return parsed;
  const raw = target.slice(mark + 1);
  if (!parsed.entries || !raw || raw.length > 64) return { ...parsed, malformed: true };
  const seen = new Set<string>();
  for (const pair of raw.split('&')) {
    const [name, value, ...rest] = pair.split('=');
    if (!name || !value || rest.length || seen.has(name)) return { ...parsed, malformed: true };
    seen.add(name);
    if (name === 'after' && canonical.test(value)) parsed.after = value;
    else if (name === 'limit' && /^(?:[1-9]|[1-4][0-9]|50)$/.test(value))
      parsed.limit = Number(value);
    else return { ...parsed, malformed: true };
  }
  return parsed;
}

type Token = { type: 'string' | 'integer' | 'null' | 'punctuation'; text: string };
type Field = Record<string, () => unknown>;
// Parse only the small JSON grammar used by the public wire contract. Rejecting
// duplicate field names avoids silently accepting an ambiguous upstream object.
class ProjectionReader {
  private index = 0;
  private readonly lexer = new RegExp(
    String.raw`[ \r\n\t]*("(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|-?(?:0|[1-9][0-9]*)|null|[{}\[\]:,])`,
    'gy',
  );

  constructor(private readonly raw: string) {}

  private peek(): Token {
    this.lexer.lastIndex = this.index;
    const text = this.lexer.exec(this.raw)?.[1];
    if (!text) return unavailable();
    if (text.startsWith('"')) return { type: 'string', text };
    if (text === 'null') return { type: 'null', text };
    if (/^-?[0-9]/.test(text)) return { type: 'integer', text };
    return { type: 'punctuation', text };
  }

  private take(): Token {
    const result = this.peek();
    this.index = this.lexer.lastIndex;
    return result;
  }

  private punct(delimiter: string) {
    const token = this.take();
    if (token.type !== 'punctuation' || token.text !== delimiter) unavailable();
  }

  private isPunctuation(delimiter: string) {
    const token = this.peek();
    return token.type === 'punctuation' && token.text === delimiter;
  }

  finish() {
    if (!/^[ \r\n\t]*$/.test(this.raw.slice(this.index))) unavailable();
  }

  text(): string | null {
    const value = this.take();
    if (value.type === 'null') return null;
    if (value.type !== 'string') return unavailable();
    return JSON.parse(value.text) as string;
  }

  id(): string {
    const value = this.text();
    if (value === null || !canonical.test(value)) return unavailable();
    return value;
  }

  integer(): bigint {
    const value = this.take();
    if (value.type !== 'integer' || value.text === '-0') return unavailable();
    return BigInt(value.text);
  }

  object<T>(fields: Field): T {
    this.punct('{');
    const values: Record<string, unknown> = Object.create(null);
    let count = 0;
    while (!this.isPunctuation('}')) {
      if (count) this.punct(',');
      const key = this.text();
      if (!key || !Object.hasOwn(fields, key) || Object.hasOwn(values, key)) return unavailable();
      this.punct(':');
      values[key] = fields[key]!();
      count++;
    }
    this.punct('}');
    if (count !== Object.keys(fields).length) return unavailable();
    return values as T;
  }

  list<T>(maximum: number, item: () => T): T[] {
    this.punct('[');
    const items: T[] = [];
    while (!this.isPunctuation(']')) {
      if (items.length >= maximum) return unavailable();
      if (items.length) this.punct(',');
      items.push(item());
    }
    this.punct(']');
    return items;
  }
}

function summary(raw: string, id: string) {
  const reader = new ProjectionReader(raw);
  const value = reader.object<{ ranking_id: string; ranking_name: string | null }>({
    ranking_id: () => reader.id(),
    ranking_name: () => reader.text(),
  });
  reader.finish();
  if (value.ranking_id !== id) return unavailable();
  return JSON.stringify(value);
}

function page(raw: string, request: Request) {
  const reader = new ProjectionReader(raw);
  type Row = { entry_id: string; title: string | null; total: bigint; votes: bigint };
  const value = reader.object<{ items: Row[]; next_cursor: string | null }>({
    items: () =>
      reader.list(request.limit, () =>
        reader.object<Row>({
          entry_id: () => reader.id(),
          title: () => reader.text(),
          total: () => reader.integer(),
          votes: () => reader.integer(),
        }),
      ),
    next_cursor: () => {
      const cursor = reader.text();
      if (cursor !== null && !canonical.test(cursor)) return unavailable();
      return cursor;
    },
  });
  reader.finish();

  let previous = request.after;
  for (const item of value.items) {
    if (
      (previous !== null && item.entry_id <= previous) ||
      item.votes < 0n ||
      (item.votes === 0n && item.total !== 0n)
    )
      return unavailable();
    previous = item.entry_id;
  }
  if (
    value.next_cursor !== null &&
    (value.next_cursor !== previous || value.items.length !== request.limit)
  )
    return unavailable();
  const rows = value.items.map(
    ({ entry_id, title, total, votes }) =>
      `{"entry_id":${JSON.stringify(entry_id)},"title":${JSON.stringify(title)},"total":${total},"votes":${votes}}`,
  );
  return `{"items":[${rows.join(',')}],"next_cursor":${JSON.stringify(value.next_cursor)}}`;
}

async function rawBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return unavailable();
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

async function fetchRead(url: URL): Promise<{ status: number; raw: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (
      response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
      'application/json'
    )
      return unavailable();
    return { status: response.status, raw: await rawBody(response) };
  } catch {
    return unavailable();
  }
}

function verifiedStatus(status: number, raw: string) {
  if (status === 200) return;
  if (status === 404 || status === 400) {
    const reader = new ProjectionReader(raw);
    const value = reader.object<{ code: string | null }>({ code: () => reader.text() });
    reader.finish();
    if (status === 404 && value.code === 'ranking.not_found') return notFound();
    if (status === 400 && value.code === 'ranking.invalid_page') return invalidPage();
  }
  return unavailable();
}

/** Anonymous transport never takes inbound cookies, actor, token or header bag. */
export async function readPublicRanking(request: Request, configuredUpstream: string) {
  if (
    !canonical.test(request.id) ||
    (request.after !== null && !canonical.test(request.after)) ||
    !Number.isInteger(request.limit) ||
    request.limit < 1 ||
    request.limit > 50
  )
    return notFound();
  const base = fixedUpstream(configuredUpstream);
  const safe = new URL(
    `${base.pathname.replace(/\/$/, '')}/public/rankings/${request.id}`,
    base.origin,
  );
  if (!request.malformed && request.entries) {
    safe.pathname += '/entries';
    if (request.after) safe.searchParams.set('after', request.after);
    safe.searchParams.set('limit', String(request.limit));
  }
  const result = await fetchRead(safe);
  verifiedStatus(result.status, result.raw);
  if (request.malformed) {
    // Preserve upstream privacy precedence without forwarding malformed options or a body.
    summary(result.raw, request.id);
    return invalidPage();
  }
  return request.entries ? page(result.raw, request) : summary(result.raw, request.id);
}
