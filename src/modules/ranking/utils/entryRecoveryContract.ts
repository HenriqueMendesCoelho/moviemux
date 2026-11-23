export const MAX_ENTRY_VERSION = 9223372036854775807n;
export const RECOVERY_RECEIPT_LIMIT = 1024;
export const RECOVERY_WARNING = 'ranking.entry_removal_permanent_after_retention';
export const RECOVERY_SECONDS = 86400;
const recoveryId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export function isRecoveryId(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && recoveryId.test(value);
}

export interface EntryRecoveryReceipt {
  entry_id: string;
  version: bigint;
  removed_at: string | null;
  expires_at: string | null;
  warning_code: typeof RECOVERY_WARNING;
  recovery_seconds: typeof RECOVERY_SECONDS;
}

const string = String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
const space = String.raw`[ \t\r\n]*`;
// The endpoint contracts are bounded, flat JSON. Decode keys before checking
// uniqueness, and never parse an integer through Number.
export function recoveryFields(raw: string): Map<string, string> | undefined {
  if (raw.length > RECOVERY_RECEIPT_LIMIT) return undefined;
  const object = /^[ \t\r\n]*\{([\s\S]*)\}[ \t\r\n]*$/.exec(raw);
  if (!object || object[0].length !== raw.length || object[1] === undefined) return undefined;
  const contents = object[1];
  const field = new RegExp(
    `${space}(${string})${space}:${space}(${string}|null|true|false|0|[1-9][0-9]*)${space}(,|$)`,
    'gy',
  );
  const out = new Map<string, string>();
  while (field.lastIndex < contents.length) {
    const m = field.exec(contents);
    if (!m?.[1] || !m[2] || (m[3] === ',' && field.lastIndex === contents.length)) return undefined;
    const key = JSON.parse(m[1]) as string;
    if (out.has(key)) return undefined;
    out.set(key, m[2]);
  }
  return out;
}
export function recoveryText(raw?: string): string | undefined {
  return raw?.startsWith('"') ? (JSON.parse(raw) as string) : undefined;
}
export function entryVersion(raw?: string): bigint | undefined {
  if (!raw || !/^(?:0|[1-9][0-9]{0,18})$/.test(raw)) return undefined;
  const number = BigInt(raw);
  return number <= MAX_ENTRY_VERSION ? number : undefined;
}
export function recoverableRemoveVersion(raw: string): bigint | undefined {
  const fields = recoveryFields(raw);
  const number = entryVersion(fields?.get('expected_version'));
  return fields?.size === 2 &&
    fields.get('confirm') === 'true' &&
    number !== undefined &&
    number < MAX_ENTRY_VERSION
    ? number
    : undefined;
}

const timestampPattern =
  /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.(\d{1,9}))?(Z|([+-])(\d\d):(\d\d)(?::(\d\d))?)$/;
function nanoseconds(timestamp: string): bigint | undefined {
  const m = timestampPattern.exec(timestamp);
  if (!m || m[0].length !== timestamp.length) return undefined;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const offsetHour = Number(m[10] ?? 0),
    offsetMinute = Number(m[11] ?? 0),
    offsetSecond = Number(m[12] ?? 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 18 ||
    offsetMinute > 59 ||
    offsetSecond > 59 ||
    (offsetHour === 18 && (offsetMinute !== 0 || offsetSecond !== 0))
  )
    return undefined;
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  utc.setUTCHours(hour, minute, second, 0);
  if (utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return undefined;
  const offset = (offsetHour * 3600 + offsetMinute * 60 + offsetSecond) * (m[9] === '-' ? -1 : 1);
  return (
    BigInt(utc.getTime()) * 1000000n +
    BigInt((m[7] ?? '').padEnd(9, '0')) -
    BigInt(offset) * 1000000000n
  );
}

export function validRecoveryWindow(removedAt: string, expiresAt: string): boolean {
  const start = nanoseconds(removedAt);
  const end = nanoseconds(expiresAt);
  return (
    start !== undefined &&
    end !== undefined &&
    end - start === BigInt(RECOVERY_SECONDS) * 1000000000n
  );
}

export function entryRecoveryReceipt(
  raw: string,
  expectedEntry: string,
  shape: 'upstream' | 'client',
): EntryRecoveryReceipt | undefined {
  const fields = recoveryFields(raw);
  if (fields?.size !== (shape === 'upstream' ? 7 : 6)) return undefined;
  const id = recoveryText(fields.get('entry_id'));
  const version = entryVersion(fields.get('version'));
  if (
    !id ||
    !isRecoveryId(id) ||
    id !== expectedEntry ||
    version === undefined ||
    recoveryText(fields.get('warning_code')) !== RECOVERY_WARNING ||
    fields.get('recovery_seconds') !== String(RECOVERY_SECONDS)
  )
    return undefined;
  const removed = fields.get('removed_at');
  const expires = fields.get('expires_at');
  const token = fields.get('removal_token');
  if (shape === 'client' && token !== undefined) return undefined;
  const summary = {
    entry_id: id,
    version,
    warning_code: RECOVERY_WARNING,
    recovery_seconds: RECOVERY_SECONDS,
  } as const;
  if (removed === 'null' && expires === 'null' && (shape === 'client' || token === 'null'))
    return { ...summary, removed_at: null, expires_at: null };
  const removedAt = recoveryText(removed);
  const expiresAt = recoveryText(expires);
  if (!removedAt || !expiresAt || (shape === 'upstream' && !isRecoveryId(recoveryText(token))))
    return undefined;
  if (!validRecoveryWindow(removedAt, expiresAt)) return undefined;
  return { ...summary, removed_at: removedAt, expires_at: expiresAt };
}
