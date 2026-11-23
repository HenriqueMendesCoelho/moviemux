import { createError } from 'nuxt/server';

const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const pathPattern = new RegExp(`^/rankings/${uuid}/settings/visibility$`);
const invalidCode = 'ranking.invalid_visibility_settings';
const notFoundCode = 'ranking.not_found';
const token = String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
const ws = String.raw`[ \t\r\n]*`;
// Exactly one decoded string field; duplicate keys, extras and trailing tokens never parse.
const oneStringField = new RegExp(`^${ws}\\{${ws}(${token})${ws}:${ws}(${token})${ws}\\}${ws}$`);
export const RANKING_VISIBILITY_BODY_LIMIT = 1024;
type Operation = 'read' | 'write';
type Visibility = 'PUBLIC' | 'PRIVATE';

export function rankingVisibilityOperation(path: string, method: string): Operation | undefined {
  if (!pathPattern.test(path)) return undefined;
  if (method === 'GET') return 'read';
  if (method === 'PUT') return 'write';
  return undefined;
}
export function invalidVisibilitySettings(): never {
  throw createError({
    status: 400,
    message: 'Invalid visibility settings',
    data: { code: invalidCode },
  });
}
function field(raw: string, key: string): string | undefined {
  if (Buffer.byteLength(raw, 'utf8') > RANKING_VISIBILITY_BODY_LIMIT) return undefined;
  const m = oneStringField.exec(raw);
  return m?.[1] && m[2] && m[0].length === raw.length && JSON.parse(m[1]) === key
    ? (JSON.parse(m[2]) as string)
    : undefined;
}
function visibility(raw: string): Visibility | undefined {
  const value = field(raw, 'visibility');
  return value === 'PRIVATE' || value === 'PUBLIC' ? value : undefined;
}
export function rankingVisibilityBody(operation: Operation, body?: string, contentType?: string) {
  if (operation === 'read') {
    if (body) return invalidVisibilitySettings();
    return undefined;
  }
  const value = contentType === 'application/json' ? visibility(body ?? '') : undefined;
  if (!value) return invalidVisibilitySettings();
  return JSON.stringify({ visibility: value });
}
export function rankingVisibilityError(status: number, raw: string) {
  const code = field(raw, 'code');
  if (status === 400 && code === invalidCode) return code;
  if (status === 404 && code === notFoundCode) return code;
  return undefined;
}
export function rankingVisibilityResponse(
  operation: Operation,
  status: number,
  raw: string,
  requestBody?: string,
) {
  const value = visibility(raw);
  if (
    status !== 200 ||
    !value ||
    (operation === 'write' && visibility(requestBody ?? '') !== value)
  )
    throw createError({
      status: 502,
      message: 'Unconfirmed visibility settings',
    });
  return { status: 200, data: { visibility: value } };
}
