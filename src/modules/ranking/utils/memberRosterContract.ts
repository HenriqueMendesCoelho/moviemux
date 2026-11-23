export const ROSTER_CAPABILITIES = [
  'READ',
  'RATE_OWN',
  'ADD_ENTRY',
  'REMOVE_OWN_ENTRY',
  'REMOVE_ENTRY',
  'INVITE_MEMBER',
  'MANAGE_MEMBERS',
] as const;
export type RankingCapability = (typeof ROSTER_CAPABILITIES)[number];
export interface OwnerRosterMember {
  membership_id: string;
  display_name: string | null;
  capabilities: RankingCapability[];
}
export interface OwnerRosterPage {
  items: OwnerRosterMember[];
  next_cursor: string | null;
}
export const MEMBER_ROSTER_DEFAULT_LIMIT = 20;
export const MEMBER_ROSTER_MAX_LIMIT = 50;
export interface RosterPaging {
  after?: string;
  limit: number;
}
export type RosterOperation = 'list' | 'replace';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export function isMemberRosterId(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && uuid.test(value);
}
export function rosterFields(
  value: unknown,
  ...keys: string[]
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === keys.length && keys.every((key) => Object.hasOwn(v, key))
    ? v
    : undefined;
}
export function rosterCapabilities(value: unknown): RankingCapability[] | undefined {
  if (!Array.isArray(value) || value.length > 100) return undefined;
  const capabilities = new Set<RankingCapability>();
  for (const item of value) {
    if (!(ROSTER_CAPABILITIES as readonly unknown[]).includes(item)) return undefined;
    capabilities.add(item as RankingCapability);
  }
  return [...capabilities];
}
export function memberRosterPage(
  value: unknown,
  { after, limit }: RosterPaging,
): OwnerRosterPage | undefined {
  const data = rosterFields(value, 'items', 'next_cursor');
  if (!data || !Array.isArray(data.items) || data.items.length > limit) return undefined;
  const { next_cursor } = data;
  if (next_cursor !== null && !isMemberRosterId(next_cursor)) return undefined;
  let previous = after;
  const items: OwnerRosterMember[] = [];
  for (const item of data.items) {
    const row = rosterFields(item, 'membership_id', 'display_name', 'capabilities');
    if (!row) return undefined;
    const { membership_id, display_name, capabilities } = row;
    const grants = rosterCapabilities(capabilities);
    if (
      !isMemberRosterId(membership_id) ||
      (previous !== undefined && membership_id <= previous) ||
      (display_name !== null && typeof display_name !== 'string') ||
      !Array.isArray(capabilities) ||
      grants === undefined ||
      grants.length !== capabilities.length
    )
      return undefined;
    previous = membership_id;
    // Never fall back to account data, even if an upstream labels it as a name.
    const name =
      display_name && display_name.trim() && !display_name.includes('@') ? display_name : null;
    items.push({ membership_id, display_name: name, capabilities: grants });
  }
  if (
    next_cursor !== null &&
    (items.length !== limit || items.at(-1)?.membership_id !== next_cursor)
  )
    return undefined;
  return { items, next_cursor };
}
export function memberRosterErrorCode(kind: RosterOperation, status: number, code: unknown) {
  if (status === 404 && code === 'ranking.not_found') return code;
  if (status === 400 && kind === 'list' && code === 'ranking.invalid_page') return code;
  if (status === 400 && kind === 'replace' && code === 'ranking.invalid_capabilities') return code;
  return undefined;
}
