import api from '~/core/http';

const addressPath = '/user/ranking-invitation-address';

// A 16-byte value encodes to 22 unpadded characters with four zero pad bits.
export function isInvitationAddress(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{21}[AQgw]$/.test(value);
}
function projectAddress(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('recipient_code' in value))
    throw new Error('Invalid invitation address response');
  const code = value.recipient_code;
  if (code !== null && !isInvitationAddress(code))
    throw new Error('Invalid invitation address response');
  return code;
}
export default {
  async readAddress(signal?: AbortSignal): Promise<string | null> {
    const { data, status } = await api.get(addressPath, { signal });
    if (status !== 200) throw new Error('Unconfirmed invitation address response');
    return projectAddress(data);
  },
  async rotateAddress(): Promise<string> {
    const { data, status } = await api.post(`${addressPath}/rotate`);
    if (status !== 200) throw new Error('Unconfirmed invitation address change');
    const result = projectAddress(data);
    if (result === null) throw new Error('Unconfirmed invitation address change');
    return result;
  },
};
