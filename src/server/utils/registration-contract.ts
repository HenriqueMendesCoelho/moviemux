import { createError } from 'nuxt/server';
import {
  adminWaitlistInviteId,
  adminWaitlistPaging,
  adminWaitlistResponse,
} from './registration-admin-contract';

export type RegistrationOperation =
  | 'public-mode'
  | 'admin-mode'
  | 'admin-update'
  | 'waitlist'
  | 'signup'
  | 'admin-list'
  | 'admin-invite';
export type RegistrationMode = 'INVITE_ONLY' | 'WAITLIST' | 'OPEN';
export const REGISTRATION_BODY_LIMIT = 4096;
const modeLimit = 1024;
const token = String.raw`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
const ws = String.raw`[ \t\r\n]*`;
const field = new RegExp(`${ws}(${token})${ws}:${ws}(${token}|null)${ws}`, 'y');

export function registrationOperation(
  path: string,
  method: string,
): RegistrationOperation | undefined {
  if (path === '/public/registration-mode' && method === 'GET') return 'public-mode';
  if (path === '/restricted/registration-mode') {
    if (method === 'GET') return 'admin-mode';
    if (method === 'PUT') return 'admin-update';
  }
  if (path === '/public/registration-waitlist' && method === 'POST') return 'waitlist';
  if (path === '/restricted/registration-waitlist' && method === 'GET') return 'admin-list';
  if (method === 'POST' && adminWaitlistInviteId(path)) return 'admin-invite';
  if (path === '/public/user' && method === 'POST') return 'signup';
}
export function registrationBodyless(operation: RegistrationOperation) {
  return ['public-mode', 'admin-mode', 'admin-list', 'admin-invite'].includes(operation);
}
export function registrationQuery(operation: RegistrationOperation, rawQuery?: string) {
  if (operation === 'admin-list') adminWaitlistPaging(rawQuery);
  else if (rawQuery !== undefined) invalidRegistration();
}
export function invalidRegistration(): never {
  throw createError({
    status: 400,
    message: 'Invalid registration request',
    data: { code: 'registration.invalid_request' },
  });
}

// Minimal flat JSON grammar: decoded duplicate keys, extra values and trailing
// tokens fail closed. Never echo an input field in an error.
function fields(raw: string, limit: number): Record<string, string | null> | undefined {
  if (Buffer.byteLength(raw, 'utf8') > limit) return;
  const start = /^[ \t\r\n]*\{/.exec(raw);
  if (!start) return;
  const result: Record<string, string | null> = Object.create(null);
  let pos = start[0].length;
  while (Object.keys(result).length < 8) {
    field.lastIndex = pos;
    const match = field.exec(raw);
    if (!match?.[1] || !match[2]) return;
    const key = JSON.parse(match[1]) as string;
    if (Object.hasOwn(result, key)) return;
    result[key] = JSON.parse(match[2]) as string | null;
    pos = field.lastIndex;
    if (raw[pos] === '}' && /^[ \t\r\n]*$/.test(raw.slice(pos + 1))) return result;
    if (raw[pos++] !== ',') return;
  }
}
function oneField(raw: string, key: string) {
  const value = fields(raw, modeLimit);
  return value && Object.keys(value).length === 1 ? value[key] : undefined;
}
function mode(raw: string): RegistrationMode | undefined {
  const value = oneField(raw, 'mode');
  if (value === 'INVITE_ONLY' || value === 'WAITLIST' || value === 'OPEN') return value;
}
export function registrationRequestBody(
  operation: RegistrationOperation,
  raw: string | undefined,
  contentType: string | undefined,
): string | undefined {
  if (registrationBodyless(operation)) {
    if (raw) return invalidRegistration();
    return undefined;
  }
  if (operation === 'signup') return raw;
  if (contentType !== 'application/json') return invalidRegistration();
  if (operation === 'admin-update') {
    const value = mode(raw ?? '');
    if (!value) return invalidRegistration();
    return JSON.stringify({ mode: value });
  }
  const value = fields(raw ?? '', REGISTRATION_BODY_LIMIT);
  if (
    !value ||
    Object.keys(value).some((key) => key !== 'email' && key !== 'cf-turnstile-response')
  )
    return invalidRegistration();
  // Email formatting/normalization and mode are owned by the backend. This
  // boundary only accepts a bounded scalar and the browser CAPTCHA field.
  if (typeof value.email !== 'string') return invalidRegistration();
  let start = 0;
  let end = value.email.length;
  while (start < end && value.email.charCodeAt(start) <= 32) start++;
  while (end > start && value.email.charCodeAt(end - 1) <= 32) end--;
  const normalized = value.email.slice(start, end).toLowerCase();
  if (!normalized || Array.from(normalized).length > 100) return invalidRegistration();
  const proof = value['cf-turnstile-response'];
  if (proof !== undefined && proof !== null && (typeof proof !== 'string' || proof.length > 2048))
    return invalidRegistration();
  return JSON.stringify({ email: value.email, 'cf-turnstile-response': proof });
}
export function registrationError(operation: RegistrationOperation, status: number, raw: string) {
  if (operation === 'signup' && status === 400 && Buffer.byteLength(raw, 'utf8') <= 4096) {
    // Preserve the single safe legacy compatibility code without forwarding
    // the old envelope, which may contain application details.
    try {
      const value: unknown = JSON.parse(raw);
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.hasOwn(value, 'code') &&
        (value as { code?: unknown }).code === 'registration.invite_required'
      )
        return 'registration.invite_required';
    } catch {
      // Unknown or malformed upstream errors remain generic.
    }
  }
  const code = oneField(raw, 'code');
  if (status === 400 && code === 'registration.invalid_request') return code;
  if (
    status === 409 &&
    (operation === 'waitlist' || operation === 'signup') &&
    code === 'registration.mode_changed'
  )
    return code;
  if (operation === 'admin-invite') {
    if (status === 404 && code === 'registration.request_not_found') return code;
    if (
      status === 409 &&
      (code === 'registration.invitation_in_progress' || code === 'registration.invitation_revoked')
    )
      return code;
  }
  if (status === 503 && code === 'registration.unavailable') return code;
}
export function registrationResponse(
  operation: RegistrationOperation,
  status: number,
  raw: string,
  requestBody?: string,
  path = '',
) {
  if (operation === 'admin-list' || operation === 'admin-invite')
    return adminWaitlistResponse(operation, status, raw, path);
  if (operation === 'waitlist' && status === 202 && raw === '') return { status, data: null };
  const value = operation !== 'waitlist' ? mode(raw) : undefined;
  if (
    status === 200 &&
    value &&
    (operation !== 'admin-update' || value === mode(requestBody ?? ''))
  )
    return { status, data: { mode: value } };
  throw createError({ status: 502, message: 'Unconfirmed registration response' });
}
