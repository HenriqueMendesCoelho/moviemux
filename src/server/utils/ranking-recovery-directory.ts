import { createError } from 'nuxt/server';
import {
  isRecoveryId,
  recoveryFields,
  recoveryText,
} from '../../modules/ranking/utils/entryRecoveryContract';
import {
  isExpectedRecoveryVersion,
  recoveryErrorCode,
  recoveryPage,
  RECOVERY_DEFAULT_LIMIT,
  RECOVERY_MAX_LIMIT,
  restoredEntry,
  type RecoveryPageOptions,
} from '../../modules/ranking/utils/entryRecoveryDirectory';
import { invalidEntryRemoval } from './ranking-entry-recovery';

const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const paths = new RegExp(`^/rankings/${uuid}/entries/(?:recovery|(${uuid})/restore-current)$`);
export const RESTORE_CURRENT_BODY_LIMIT = 512;
type Operation = { kind: 'list' } | { kind: 'restore'; entryId: string };

export function recoveryDirectoryOperation(path: string, method: string): Operation | undefined {
  const match = paths.exec(path);
  if (!match || match[0].length !== path.length) return undefined;
  if (match[1] && method === 'POST') return { kind: 'restore', entryId: match[1] };
  if (!match[1] && method === 'GET') return { kind: 'list' };
  return undefined;
}
export function recoveryDirectoryOptions(raw: string | undefined): RecoveryPageOptions {
  if (raw === undefined) return { limit: RECOVERY_DEFAULT_LIMIT };
  if (!raw || raw.length > 64) return invalidEntryRemoval();
  let after: string | undefined, limit: number | undefined;
  for (const pair of raw.split('&')) {
    if (pair.startsWith('after=')) {
      const value = pair.slice(6).toLowerCase();
      if (after !== undefined || !isRecoveryId(value)) return invalidEntryRemoval();
      after = value;
    } else if (pair.startsWith('limit=')) {
      const value = pair.slice(6);
      if (limit !== undefined || !/^[0-9]{1,10}$/.test(value) || value.trim() !== value)
        return invalidEntryRemoval();
      limit = Number(value);
      if (limit < 1 || limit > RECOVERY_MAX_LIMIT) return invalidEntryRemoval();
    } else return invalidEntryRemoval();
  }
  return { after, limit: limit ?? RECOVERY_DEFAULT_LIMIT };
}
export function recoveryDirectoryQuery(operation: Operation, raw: string | undefined) {
  if (operation.kind === 'list') recoveryDirectoryOptions(raw);
  else if (raw !== undefined) invalidEntryRemoval();
}
function restoreVersion(raw: string | undefined): string | undefined {
  if (!raw || Buffer.byteLength(raw, 'utf8') > RESTORE_CURRENT_BODY_LIMIT) return undefined;
  const fields = recoveryFields(raw);
  if (fields?.size !== 1) return undefined;
  const version = recoveryText(fields.get('expected_version'));
  return isExpectedRecoveryVersion(version) ? version : undefined;
}
export function recoveryDirectoryBody(operation: Operation, raw?: string, contentType?: string) {
  if (operation.kind === 'list') {
    if (raw) invalidEntryRemoval();
    return undefined;
  }
  const version = contentType === 'application/json' ? restoreVersion(raw) : undefined;
  if (version === undefined) return invalidEntryRemoval();
  return JSON.stringify({ expected_version: version });
}
export function recoveryDirectoryError(operation: Operation, status: number, raw: string) {
  if (Buffer.byteLength(raw, 'utf8') > 1024) return undefined;
  const fields = recoveryFields(raw);
  if (fields?.size !== 1) return undefined;
  return recoveryErrorCode(operation.kind, status, recoveryText(fields.get('code')));
}
const listString = new RegExp(
  String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`,
  'y',
);
const listSpace = /[ \t\r\n]*/y;

// Only this DTO's strings/null, 50 rows and 3 levels. Keep decoded field
// uniqueness so a broken upstream can't silently replace an authorized value.
function parseList(raw: string): unknown {
  let pos = 0;
  const skip = () => {
    listSpace.lastIndex = pos;
    listSpace.exec(raw);
    pos = listSpace.lastIndex;
  };
  const string = () => {
    listString.lastIndex = pos;
    const token = listString.exec(raw)?.[0];
    if (!token) return undefined;
    pos = listString.lastIndex;
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
    } else if (raw[pos] === '[' && depth === 1) {
      pos++;
      const items: unknown[] = [];
      skip();
      if (raw[pos] === ']') {
        pos++;
        return items;
      }
      while (items.length < RECOVERY_MAX_LIMIT && pos < raw.length) {
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
export function recoveryDirectoryResponse(
  operation: Operation,
  status: number,
  raw: string,
  query?: string,
  body?: string,
) {
  if (status === 200) {
    if (operation.kind === 'list') {
      const page = recoveryPage(parseList(raw), recoveryDirectoryOptions(query));
      if (page) return { status, data: page };
    } else {
      const expected = restoreVersion(body);
      const fields = recoveryFields(raw);
      const result =
        fields?.size === 2 && expected !== undefined
          ? restoredEntry(
              {
                entry_id: recoveryText(fields.get('entry_id')),
                version: recoveryText(fields.get('version')),
              },
              operation.entryId,
              expected,
            )
          : undefined;
      if (result) return { status, data: result };
    }
  }
  throw createError({ status: 502, message: 'Unconfirmed entry recovery response' });
}
