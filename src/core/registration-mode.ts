export type RegistrationMode = 'INVITE_ONLY' | 'WAITLIST' | 'OPEN';

export function isRegistrationMode(value: unknown): value is RegistrationMode {
  return value === 'INVITE_ONLY' || value === 'WAITLIST' || value === 'OPEN';
}
