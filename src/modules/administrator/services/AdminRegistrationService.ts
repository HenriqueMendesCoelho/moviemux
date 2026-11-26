import api from '~/core/http';
import { isRegistrationMode, type RegistrationMode } from '~/core/registration-mode';

const MODE_PATH = '/restricted/registration-mode';
const WAITLIST_PATH = '/restricted/registration-waitlist';
export const WAITLIST_PAGE_SIZE = 20;
export const WAITLIST_STATUSES = [
  'PENDING',
  'SENDING',
  'GATEWAY_ACCEPTED',
  'DELIVERY_FAILED',
  'DELIVERY_UNKNOWN',
  'DELIVERY_UNAVAILABLE',
  'REVOKED',
] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export interface WaitlistRequest {
  request_id: string;
  email: string;
  requested_at: string;
  status: WaitlistStatus;
}
export interface WaitlistPage {
  items: WaitlistRequest[];
  next_cursor: string | null;
}
export interface WaitlistInviteReceipt {
  request_id: string;
  status: WaitlistStatus;
  invite_code: string;
}
export class AdminRegistrationError extends Error {
  constructor(readonly status?: number) {
    super('Registration administration unavailable or unconfirmed');
    this.name = 'AdminRegistrationError';
  }
}
function exact(value: unknown, ...keys: string[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || !keys.every((k) => Object.hasOwn(record, k)))
    return undefined;
  return record;
}
function id(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
  );
}
function status(value: unknown): value is WaitlistStatus {
  return typeof value === 'string' && WAITLIST_STATUSES.some((item) => item === value);
}
function fail(): never {
  throw new AdminRegistrationError();
}
function clean(error: unknown): never {
  const value = (error as { response?: { status?: unknown } } | undefined)?.response?.status;
  throw new AdminRegistrationError(typeof value === 'number' ? value : undefined);
}
function clientOnly() {
  if (import.meta.server) fail();
}
function mode(data: unknown): RegistrationMode {
  const value = exact(data, 'mode')?.mode;
  return isRegistrationMode(value) ? value : fail();
}
function row(data: unknown): WaitlistRequest {
  const item = exact(data, 'request_id', 'email', 'requested_at', 'status');
  if (
    !item ||
    !id(item.request_id) ||
    typeof item.email !== 'string' ||
    !item.email ||
    Array.from(item.email).length > 100 ||
    Array.from(item.email).some((character) => {
      const code = character.codePointAt(0)!;
      return code < 32 || (code >= 127 && code <= 159);
    }) ||
    typeof item.requested_at !== 'string' ||
    item.requested_at.length > 64 ||
    !Number.isFinite(Date.parse(item.requested_at)) ||
    !status(item.status)
  )
    return fail();
  return {
    request_id: item.request_id,
    email: item.email,
    requested_at: item.requested_at,
    status: item.status,
  };
}
function page(data: unknown, after?: string): WaitlistPage {
  const value = exact(data, 'items', 'next_cursor');
  if (
    !value ||
    !Array.isArray(value.items) ||
    value.items.length > WAITLIST_PAGE_SIZE ||
    !(value.next_cursor === null || id(value.next_cursor))
  )
    return fail();
  const items = value.items.map(row);
  const unique = new Set(items.map((item) => item.request_id));
  if (
    unique.size !== items.length ||
    (after && unique.has(after)) ||
    (value.next_cursor !== null &&
      (items.length !== WAITLIST_PAGE_SIZE ||
        value.next_cursor === after ||
        value.next_cursor !== items.at(-1)?.request_id))
  )
    return fail();
  return { items, next_cursor: value.next_cursor };
}
function receipt(data: unknown, requestId: string): WaitlistInviteReceipt {
  const value = exact(data, 'request_id', 'status', 'invite_code');
  if (
    !value ||
    value.request_id !== requestId ||
    !status(value.status) ||
    !['GATEWAY_ACCEPTED', 'DELIVERY_FAILED', 'DELIVERY_UNKNOWN', 'DELIVERY_UNAVAILABLE'].includes(
      value.status,
    ) ||
    typeof value.invite_code !== 'string' ||
    !/^KB-[0-9]{8,9}$/.test(value.invite_code) ||
    value.invite_code.trim() !== value.invite_code
  )
    return fail();
  return { request_id: requestId, status: value.status, invite_code: value.invite_code };
}

export default {
  async adminMode(signal?: AbortSignal): Promise<RegistrationMode> {
    clientOnly();
    const { status, data } = await api.get(MODE_PATH, { signal }).catch(clean);
    if (status !== 200) return fail();
    return mode(data);
  },
  async setAdminMode(value: RegistrationMode, signal?: AbortSignal): Promise<RegistrationMode> {
    clientOnly();
    if (!isRegistrationMode(value)) return fail();
    const { status, data } = await api.put(MODE_PATH, { mode: value }, { signal }).catch(clean);
    if (status !== 200 || mode(data) !== value) return fail();
    return value;
  },
  async adminWaitlist(after?: string, signal?: AbortSignal): Promise<WaitlistPage> {
    clientOnly();
    if (after !== undefined && !id(after)) return fail();
    const { status, data } = await api
      .get(WAITLIST_PATH, {
        params: { limit: WAITLIST_PAGE_SIZE, ...(after ? { after } : {}) },
        signal,
      })
      .catch(clean);
    if (status !== 200) return fail();
    return page(data, after);
  },
  async inviteWaitlist(requestId: string, signal?: AbortSignal): Promise<WaitlistInviteReceipt> {
    clientOnly();
    if (!id(requestId)) return fail();
    const { status, data } = await api
      .post(`${WAITLIST_PATH}/${requestId}/invite`, undefined, { signal })
      .catch(clean);
    if (status !== 200) return fail();
    return receipt(data, requestId);
  },
};
