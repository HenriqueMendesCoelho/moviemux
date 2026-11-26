import { createError } from 'nuxt/server';

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const root = '/restricted/registration-waitlist';
const outcomes = [
  'GATEWAY_ACCEPTED',
  'DELIVERY_FAILED',
  'DELIVERY_UNKNOWN',
  'DELIVERY_UNAVAILABLE',
] as const;
const statuses = ['PENDING', 'SENDING', ...outcomes, 'REVOKED'] as const;
export const WAITLIST_RESPONSE_LIMIT = 65536;
type Paging = { limit: number; after?: string };
function canonicalId(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && idPattern.test(value);
}
export function adminWaitlistInviteId(path: string) {
  if (!path.startsWith(root + '/') || !path.endsWith('/invite')) return;
  const id = path.slice(root.length + 1, -7);
  return canonicalId(id) ? id : undefined;
}
function invalid(): never {
  throw createError({
    status: 400,
    message: 'Invalid registration request',
    data: { code: 'registration.invalid_request' },
  });
}
export function adminWaitlistPaging(raw?: string): Paging {
  if (raw === undefined) return { limit: 20 };
  if (!raw || raw.length > 64) return invalid();
  let after: string | undefined, limit: number | undefined;
  for (const pair of raw.split('&')) {
    if (pair.startsWith('after=')) {
      const id = pair.slice(6);
      if (after !== undefined || !canonicalId(id)) invalid();
      after = id;
    } else if (pair.startsWith('limit=')) {
      const count = pair.slice(6);
      if (limit !== undefined || !/^[1-9][0-9]?$/.test(count) || Number(count) > 50) invalid();
      limit = Number(count);
    } else invalid();
  }
  return { limit: limit ?? 20, after };
}

const stringToken = new RegExp(
  String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`,
  'y',
);
const ws = /[ \t\r\n]*/y;
function parseResponse(raw: string): unknown {
  if (Buffer.byteLength(raw, 'utf8') > WAITLIST_RESPONSE_LIMIT) return;
  let pos = 0;
  function skip() {
    ws.lastIndex = pos;
    ws.exec(raw);
    pos = ws.lastIndex;
  }
  function string() {
    stringToken.lastIndex = pos;
    const result = stringToken.exec(raw)?.[0];
    if (result === undefined) return;
    pos = stringToken.lastIndex;
    return JSON.parse(result) as string;
  }
  function value(depth: number): unknown {
    skip();
    if (raw[pos] === '{' && (depth === 0 || depth === 2)) {
      pos++;
      skip();
      const result: Record<string, unknown> = Object.create(null);
      if (raw[pos] === '}') {
        pos++;
        return result;
      }
      while (Object.keys(result).length < 4) {
        skip();
        const key = string();
        skip();
        if (key === undefined || Object.hasOwn(result, key) || raw[pos++] !== ':') return;
        const field = value(depth + 1);
        if (field === undefined) return;
        result[key] = field;
        skip();
        const separator = raw[pos++];
        if (separator === '}') return result;
        if (separator !== ',') return;
      }
    } else if (raw[pos] === '[' && depth === 1) {
      pos++;
      skip();
      const result: unknown[] = [];
      if (raw[pos] === ']') {
        pos++;
        return result;
      }
      while (result.length < 50) {
        const item = value(depth + 1);
        if (item === undefined) return;
        result.push(item);
        skip();
        const separator = raw[pos++];
        if (separator === ']') return result;
        if (separator !== ',') return;
      }
    } else if (raw[pos] === '"') {
      return string();
    } else if (raw.startsWith('null', pos)) {
      pos += 4;
      return null;
    }
    return undefined;
  }
  const result = value(0);
  skip();
  return pos === raw.length ? result : undefined;
}
function exact(value: unknown, ...keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length === keys.length && keys.every((key) => Object.hasOwn(record, key)))
    return record;
}
function cleanEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 100 &&
    value.includes('@') &&
    Array.from(value).every((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp > 31 && !(cp >= 127 && cp <= 159) && !(cp >= 0xd800 && cp <= 0xdfff);
    })
  );
}
function offsetDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > 64 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number) as [number, number, number];
  const [hour, minute, second] = value.slice(11, 19).split(':').map(Number) as [
    number,
    number,
    number,
  ];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year > 0 &&
    day > 0 &&
    day <= (days[month - 1] ?? 0) &&
    hour < 24 &&
    minute < 60 &&
    second < 60 &&
    Number.isFinite(Date.parse(value))
  );
}
function unknownReceipt(): never {
  throw createError({ status: 502, message: 'Unconfirmed registration response' });
}
export function adminWaitlistResponse(
  operation: 'admin-list' | 'admin-invite',
  status: number,
  raw: string,
  path: string,
) {
  if (status !== 200) return unknownReceipt();
  const value = parseResponse(raw);
  if (operation === 'admin-invite') {
    const receipt = exact(value, 'request_id', 'status', 'invite_code');
    const id = adminWaitlistInviteId(path);
    if (
      !id ||
      !receipt ||
      receipt.request_id !== id ||
      typeof receipt.status !== 'string' ||
      !outcomes.some((outcome) => outcome === receipt.status) ||
      typeof receipt.invite_code !== 'string' ||
      !/^KB-[0-9]{8,9}$/.test(receipt.invite_code) ||
      receipt.invite_code.trim() !== receipt.invite_code
    )
      return unknownReceipt();
    return {
      status,
      data: { request_id: id, status: receipt.status, invite_code: receipt.invite_code },
    };
  }
  const at = path.indexOf('?');
  const paging = adminWaitlistPaging(at < 0 ? undefined : path.slice(at + 1));
  const page = exact(value, 'items', 'next_cursor');
  if (
    !page ||
    !Array.isArray(page.items) ||
    page.items.length > paging.limit ||
    !(page.next_cursor === null || canonicalId(page.next_cursor))
  )
    return unknownReceipt();
  let previous = paging.after;
  const items = [];
  for (const value of page.items) {
    const row = exact(value, 'request_id', 'email', 'requested_at', 'status');
    if (
      !row ||
      !canonicalId(row.request_id) ||
      (previous && row.request_id <= previous) ||
      !cleanEmail(row.email) ||
      !offsetDate(row.requested_at) ||
      typeof row.status !== 'string' ||
      !statuses.some((status) => status === row.status)
    )
      return unknownReceipt();
    previous = row.request_id;
    items.push({
      request_id: row.request_id,
      email: row.email,
      requested_at: row.requested_at,
      status: row.status,
    });
  }
  if (
    page.next_cursor !== null &&
    (items.length !== paging.limit || items.at(-1)?.request_id !== page.next_cursor)
  )
    return unknownReceipt();
  return { status, data: { items, next_cursor: page.next_cursor } };
}
