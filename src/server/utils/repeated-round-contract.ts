import { createError } from 'nuxt/server';
import { canonicalRoundDescription } from '../../modules/ranking/utils/roundDescription';

const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const scopedId = new RegExp(`^${uuid}$`);
const settingsPath = new RegExp(`^/rankings/${uuid}/settings/rounds$`);
const commandPath = new RegExp(`^/rankings/${uuid}/entries/${uuid}/rounds$`);
export const REPEATED_ROUND_BODY_LIMIT = 4096;
type Operation = 'read-settings' | 'write-settings' | 'create-round';

export function repeatedRoundOperation(path: string, method: string): Operation | undefined {
  if (method === 'POST' && commandPath.test(path)) return 'create-round';
  if (!settingsPath.test(path)) return undefined;
  if (method === 'GET') return 'read-settings';
  if (method === 'PUT') return 'write-settings';
  return undefined;
}
function invalidCode(operation: Operation) {
  return operation === 'create-round'
    ? 'ranking.invalid_round_command'
    : 'ranking.invalid_round_settings';
}
export function invalidRepeatedRoundRequest(operation: Operation): never {
  throw createError({
    status: 400,
    message: 'Invalid round request',
    data: { code: invalidCode(operation) },
  });
}
export function ensureRepeatedRoundReadBodyless(
  operation: Operation,
  contentLength: string | null,
  transferEncoding: string | null,
) {
  if (
    operation === 'read-settings' &&
    (transferEncoding !== null || (contentLength !== null && contentLength !== '0'))
  )
    return invalidRepeatedRoundRequest(operation);
}

function flatTokens(body: string): Map<string, string> | undefined {
  // The allowlisted object contains only strings, booleans, null or integer
  // literals. Keep decoded key uniqueness and raw integer syntax, even in receipts.
  const inner = /^[ \t\r\n]*\{([\s\S]*)\}[ \t\r\n]*$/.exec(body)?.[1];
  if (inner === undefined) return undefined;
  const string = String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
  const whitespace = String.raw`[ \t\r\n]*`;
  const field = new RegExp(
    `${whitespace}(${string})${whitespace}:${whitespace}(${string}|true|false|null|[1-9][0-9]*)${whitespace}(,|$)`,
    'gy',
  );
  const values = new Map<string, string>();
  while (field.lastIndex < inner.length) {
    const match = field.exec(inner);
    if (!match?.[1] || !match[2]) return undefined;
    const key = JSON.parse(match[1]) as string;
    if (values.has(key)) return undefined;
    values.set(key, match[2]);
    if (match[3] === ',' && field.lastIndex === inner.length) return undefined;
  }
  return values;
}
function text(token?: string): string | undefined {
  return token?.startsWith('"') ? (JSON.parse(token) as string) : undefined;
}
export function repeatedRoundBody(operation: Operation, body?: string, contentType?: string) {
  if (operation === 'read-settings') {
    if (body !== undefined && body !== '') return invalidRepeatedRoundRequest(operation);
    return undefined;
  }
  if (contentType !== 'application/json')
    throw createError({ status: 415, message: 'JSON request required' });
  if (!body || Buffer.byteLength(body, 'utf8') > REPEATED_ROUND_BODY_LIMIT)
    return invalidRepeatedRoundRequest(operation);
  const fields = flatTokens(body);
  if (!fields) return invalidRepeatedRoundRequest(operation);
  if (operation === 'write-settings') {
    const enabled = fields.get('repeat_enabled');
    if (fields.size !== 1 || (enabled !== 'true' && enabled !== 'false'))
      return invalidRepeatedRoundRequest(operation);
    return JSON.stringify({ repeat_enabled: enabled === 'true' });
  }
  const command = text(fields.get('command_id'));
  const rawDescription = fields.get('description');
  if (!command || !scopedId.test(command) || fields.size !== (rawDescription === undefined ? 1 : 2))
    return invalidRepeatedRoundRequest(operation);
  const decoded =
    rawDescription === undefined || rawDescription === 'null' ? null : text(rawDescription);
  if (decoded === undefined) return invalidRepeatedRoundRequest(operation);
  const description = canonicalRoundDescription(decoded);
  if (description === undefined) return invalidRepeatedRoundRequest(operation);
  return JSON.stringify({ command_id: command.toLowerCase(), description });
}
export function repeatedRoundError(operation: Operation, status: number, raw: string) {
  const fields = flatTokens(raw);
  if (fields?.size !== 1) return undefined;
  const code = text(fields.get('code'));
  if (status === 400 && code === invalidCode(operation)) return code;
  if (status === 404 && code === 'ranking.not_found') return code;
  if (
    operation === 'create-round' &&
    status === 409 &&
    (code === 'ranking.round_command_conflict' || code === 'ranking.repeat_rounds_disabled')
  )
    return code;
  return undefined;
}
function invalidResponse(): never {
  throw createError({ status: 502, message: 'Unconfirmed round response' });
}
export function repeatedRoundResponse(
  operation: Operation,
  status: number,
  raw: string,
  requestBody?: string,
) {
  const fields = flatTokens(raw);
  if (operation !== 'create-round') {
    const enabled = fields?.get('repeat_enabled');
    if (
      status !== 200 ||
      fields?.size !== 1 ||
      (enabled !== 'true' && enabled !== 'false') ||
      (operation === 'write-settings' &&
        flatTokens(requestBody || '')?.get('repeat_enabled') !== enabled)
    )
      return invalidResponse();
    return { status: 200, data: { repeat_enabled: enabled === 'true' } };
  }
  const id = text(fields?.get('round_id')),
    ordinal = fields?.get('round_number');
  if (
    (status !== 200 && status !== 201) ||
    fields?.size !== 2 ||
    !id ||
    !scopedId.test(id) ||
    id !== id.toLowerCase() ||
    !ordinal ||
    !/^[1-9][0-9]{0,18}$/.test(ordinal) ||
    (ordinal.length === 19 && ordinal > '9223372036854775807')
  )
    return invalidResponse();
  // No JSON.parse/Number first: Java long ordinals can exceed Number's precision.
  return {
    status,
    data: null,
    rawJson: `{"round_id":${JSON.stringify(id)},"round_number":${ordinal}}`,
  };
}
