import { createError } from 'nuxt/server';
import {
  entryRecoveryReceipt,
  RECOVERY_RECEIPT_LIMIT,
  recoverableRemoveVersion,
  recoveryFields,
  recoveryText,
} from '../../modules/ranking/utils/entryRecoveryContract';

const id = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const pathPattern = new RegExp(`^/rankings/${id}/entries/(${id})(/removal-preview)?$`);
const invalidCode = 'ranking.invalid_recovery_request';
export const ENTRY_REMOVAL_BODY_LIMIT = 1024;

export interface EntryRemovalOperation {
  kind: 'preview' | 'remove';
  entryId: string;
}
export function entryRemovalOperation(
  path: string,
  method: string,
): EntryRemovalOperation | undefined {
  const m = pathPattern.exec(path);
  if (!m?.[1] || m[0].length !== path.length) return undefined;
  if (m[2] && method === 'GET') return { kind: 'preview', entryId: m[1] };
  if (!m[2] && method === 'DELETE') return { kind: 'remove', entryId: m[1] };
  return undefined;
}
export function invalidEntryRemoval(): never {
  throw createError({
    status: 400,
    message: 'Invalid entry removal request',
    data: { code: invalidCode },
  });
}
export function entryRemovalBody(
  operation: EntryRemovalOperation,
  body?: string,
  contentType?: string,
) {
  if (operation.kind === 'preview') {
    if (body) return invalidEntryRemoval();
    return undefined;
  }
  if (
    contentType !== 'application/json' ||
    !body ||
    Buffer.byteLength(body, 'utf8') > ENTRY_REMOVAL_BODY_LIMIT
  )
    return invalidEntryRemoval();
  const version = recoverableRemoveVersion(body);
  if (version === undefined) return invalidEntryRemoval();
  return `{"expected_version":${version},"confirm":true}`;
}
export function entryRemovalError(operation: EntryRemovalOperation, status: number, raw: string) {
  if (Buffer.byteLength(raw, 'utf8') > RECOVERY_RECEIPT_LIMIT) return undefined;
  const fields = recoveryFields(raw);
  if (fields?.size !== 1) return undefined;
  const code = recoveryText(fields.get('code'));
  if (status === 400 && code === invalidCode) return code;
  if (status === 404 && code === 'ranking.not_found') return code;
  if (status === 409 && code === 'ranking.archived_read_only') return code;
  if (status === 409 && operation.kind === 'remove' && code === 'ranking.entry_state_stale')
    return code;
  return undefined;
}
export function entryRemovalResponse(
  operation: EntryRemovalOperation,
  status: number,
  raw: string,
  body?: string,
) {
  const receipt =
    Buffer.byteLength(raw, 'utf8') <= RECOVERY_RECEIPT_LIMIT
      ? entryRecoveryReceipt(raw, operation.entryId, 'upstream')
      : undefined;
  const expected = operation.kind === 'remove' ? recoverableRemoveVersion(body ?? '') : undefined;
  if (
    status !== 200 ||
    !receipt ||
    (operation.kind === 'remove' &&
      (expected === undefined || receipt.removed_at === null || receipt.version !== expected + 1n))
  )
    throw createError({ status: 502, message: 'Unconfirmed entry removal state' });
  // Keep the existing numeric wire type without losing Long precision. The
  // restore token is never emitted: the browser uses the new recovery contract.
  const { version, ...safe } = receipt;
  return {
    status: 200,
    data: null,
    rawJson: `${JSON.stringify(safe).slice(0, -1)},"version":${version}}`,
  };
}
