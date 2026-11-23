import {
  entryVersion,
  isRecoveryId,
  MAX_ENTRY_VERSION,
  validRecoveryWindow,
} from './entryRecoveryContract';

export const RECOVERY_DEFAULT_LIMIT = 20;
export const RECOVERY_MAX_LIMIT = 50;
export interface RecoveryPageOptions {
  after?: string;
  limit: number;
}
export interface RecoverableEntry {
  entry_id: string;
  title: string | null;
  removed_at: string;
  expires_at: string;
  version: string;
}
export interface RecoveryPage {
  items: RecoverableEntry[];
  next_cursor: string | null;
}
export interface RestoredEntry {
  entry_id: string;
  version: string;
}
function version(value: unknown) {
  return typeof value === 'string' && value.trim() === value ? entryVersion(value) : undefined;
}
export function isExpectedRecoveryVersion(value: unknown): value is string {
  const number = version(value);
  return number !== undefined && number < MAX_ENTRY_VERSION;
}
function exact(value: unknown, ...keys: string[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === keys.length && keys.every((key) => Object.hasOwn(v, key))
    ? v
    : undefined;
}
export function recoveryPage(
  value: unknown,
  { after, limit }: RecoveryPageOptions,
): RecoveryPage | undefined {
  const data = exact(value, 'items', 'next_cursor');
  if (!data || !Array.isArray(data.items) || data.items.length > limit) return undefined;
  const { next_cursor } = data;
  if (next_cursor !== null && !isRecoveryId(next_cursor)) return undefined;
  let previous = after;
  const items: RecoverableEntry[] = [];
  for (const item of data.items) {
    const v = exact(item, 'entry_id', 'title', 'removed_at', 'expires_at', 'version');
    if (!v) return undefined;
    const { entry_id, title, removed_at, expires_at, version: cursorVersion } = v;
    if (
      !isRecoveryId(entry_id) ||
      (previous !== undefined && entry_id <= previous) ||
      (title !== null && typeof title !== 'string') ||
      typeof removed_at !== 'string' ||
      !removed_at.endsWith('Z') ||
      typeof expires_at !== 'string' ||
      !expires_at.endsWith('Z') ||
      !validRecoveryWindow(removed_at, expires_at) ||
      typeof cursorVersion !== 'string' ||
      version(cursorVersion) === undefined
    )
      return undefined;
    previous = entry_id;
    items.push({ entry_id, title, removed_at, expires_at, version: cursorVersion });
  }
  if (next_cursor !== null && (items.length !== limit || items.at(-1)?.entry_id !== next_cursor))
    return undefined;
  return { items, next_cursor };
}
export function restoredEntry(
  value: unknown,
  entryId: string,
  expectedVersion: string,
): RestoredEntry | undefined {
  const data = exact(value, 'entry_id', 'version');
  if (
    !data ||
    data.entry_id !== entryId ||
    !isRecoveryId(entryId) ||
    typeof data.version !== 'string' ||
    !isExpectedRecoveryVersion(expectedVersion) ||
    version(data.version) !== BigInt(expectedVersion) + 1n
  )
    return undefined;
  return { entry_id: entryId, version: data.version };
}
export function recoveryErrorCode(
  kind: 'list' | 'restore' | 'preview' | 'remove',
  status: number,
  code: unknown,
) {
  if (status === 400 && code === 'ranking.invalid_recovery_request') return code;
  if (status === 404 && code === 'ranking.not_found') return code;
  if (status === 409 && code === 'ranking.archived_read_only') return code;
  if (
    status === 409 &&
    ((kind === 'restore' && code === 'ranking.entry_recovery_expired') ||
      ((kind === 'remove' || kind === 'restore') && code === 'ranking.entry_state_stale'))
  )
    return code;
  return undefined;
}
