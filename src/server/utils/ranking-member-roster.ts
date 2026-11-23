import { createError } from 'nuxt/server';
import {
  isMemberRosterId,
  memberRosterErrorCode,
  memberRosterPage,
  MEMBER_ROSTER_DEFAULT_LIMIT,
  MEMBER_ROSTER_MAX_LIMIT,
  rosterCapabilities,
  rosterFields,
  type RosterOperation,
  type RosterPaging,
} from '../../modules/ranking/utils/memberRosterContract';

const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const pathPattern = new RegExp(
  `^/rankings/${uuid}/members(?:/by-membership/${uuid}/capabilities)?$`,
);
export const MEMBER_ROSTER_BODY_LIMIT = 16_384;
export function memberRosterOperation(path: string, method: string): RosterOperation | undefined {
  const match = pathPattern.exec(path);
  if (!match || match[0].length !== path.length) return undefined;
  if (path.endsWith('/members') && method === 'GET') return 'list';
  if (path.endsWith('/capabilities') && method === 'PUT') return 'replace';
  return undefined;
}
export function invalidMemberRoster(operation: RosterOperation): never {
  throw createError({
    status: 400,
    message: 'Invalid membership roster request',
    data: { code: operation === 'list' ? 'ranking.invalid_page' : 'ranking.invalid_capabilities' },
  });
}
function paging(raw: string | undefined): RosterPaging {
  if (raw === undefined) return { limit: MEMBER_ROSTER_DEFAULT_LIMIT };
  if (!raw || raw.length > 64) return invalidMemberRoster('list');
  let after: string | undefined, limit: number | undefined;
  for (const pair of raw.split('&')) {
    if (pair.startsWith('after=')) {
      const value = pair.slice(6);
      if (after !== undefined || !isMemberRosterId(value)) return invalidMemberRoster('list');
      after = value;
    } else if (pair.startsWith('limit=')) {
      const value = pair.slice(6);
      if (limit !== undefined || !/^[0-9]{1,10}$/.test(value) || value.trim() !== value)
        return invalidMemberRoster('list');
      limit = Number(value);
      if (limit < 1 || limit > MEMBER_ROSTER_MAX_LIMIT) return invalidMemberRoster('list');
    } else return invalidMemberRoster('list');
  }
  return { after, limit: limit ?? MEMBER_ROSTER_DEFAULT_LIMIT };
}
export function memberRosterQuery(operation: RosterOperation, raw?: string) {
  if (operation === 'list') paging(raw);
  else if (raw !== undefined) invalidMemberRoster(operation);
}

const jsonString = new RegExp(
  String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`,
  'y',
);
const space = /[ \t\r\n]*/y;
// Bounded JSON grammar for this endpoint's exact shapes. Decode keys before
// checking uniqueness, and never silently overwrite or forward an extra field.
function parseRosterJson(raw: string, maxElements: number): unknown {
  let pos = 0;
  const skip = () => {
    space.lastIndex = pos;
    space.exec(raw);
    pos = space.lastIndex;
  };
  const string = () => {
    jsonString.lastIndex = pos;
    const token = jsonString.exec(raw)?.[0];
    if (!token) return undefined;
    pos = jsonString.lastIndex;
    return JSON.parse(token) as string;
  };
  function value(depth: number): unknown {
    skip();
    if (raw[pos] === '{' && (depth === 0 || depth === 2)) {
      pos++;
      const fields: Record<string, unknown> = Object.create(null);
      skip();
      if (raw[pos] === '}') {
        pos++;
        return fields;
      }
      while (pos < raw.length) {
        skip();
        const key = string();
        skip();
        if (key === undefined || Object.hasOwn(fields, key) || raw[pos++] !== ':') return undefined;
        const field = value(depth + 1);
        if (field === undefined) return undefined;
        fields[key] = field;
        skip();
        const separator = raw[pos++];
        if (separator === '}') return fields;
        if (separator !== ',') return undefined;
      }
    } else if (raw[pos] === '[' && (depth === 1 || depth === 3)) {
      pos++;
      const items: unknown[] = [];
      skip();
      if (raw[pos] === ']') {
        pos++;
        return items;
      }
      while (items.length < maxElements && pos < raw.length) {
        const item = value(depth + 1);
        if (item === undefined) return undefined;
        items.push(item);
        skip();
        const separator = raw[pos++];
        if (separator === ']') return items;
        if (separator !== ',') return undefined;
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
export function memberRosterBody(operation: RosterOperation, raw?: string, contentType?: string) {
  if (operation === 'list') {
    if (raw) invalidMemberRoster(operation);
    return undefined;
  }
  if (
    contentType !== 'application/json' ||
    !raw ||
    Buffer.byteLength(raw, 'utf8') > MEMBER_ROSTER_BODY_LIMIT
  )
    return invalidMemberRoster(operation);
  const body = rosterFields(parseRosterJson(raw, 100), 'capabilities');
  const capabilities = rosterCapabilities(body?.capabilities);
  if (!capabilities) return invalidMemberRoster(operation);
  return JSON.stringify({ capabilities });
}
export function memberRosterError(operation: RosterOperation, status: number, raw: string) {
  if (Buffer.byteLength(raw, 'utf8') > 1024) return undefined;
  return memberRosterErrorCode(
    operation,
    status,
    rosterFields(parseRosterJson(raw, 1), 'code')?.code,
  );
}
export function memberRosterResponse(
  operation: RosterOperation,
  status: number,
  raw: string,
  query?: string,
) {
  if (operation === 'replace') {
    if (status === 204 && raw === '') return { status, data: null };
  } else if (status === 200) {
    const data = memberRosterPage(parseRosterJson(raw, MEMBER_ROSTER_MAX_LIMIT), paging(query));
    if (data) return { status, data };
  }
  throw createError({ status: 502, message: 'Unconfirmed membership roster response' });
}
