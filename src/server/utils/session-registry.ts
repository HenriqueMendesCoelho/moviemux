/** Single-process revocation. Multi-instance deployments need shared storage/pubsub. */
const revoked = new Map<string, number>();
const listeners = new Set<(generation: string) => void>();
export function isSessionRevoked(generation: string): boolean {
  const until = revoked.get(generation);
  if (until === undefined) return false;
  if (until <= Date.now()) {
    revoked.delete(generation);
    return false;
  }
  return true;
}
export function revokeSession(generation: string, expiresAt: number): void {
  if (!generation) return;
  for (const [key, expiry] of revoked) if (expiry <= Date.now()) revoked.delete(key);
  if (expiresAt > Date.now()) revoked.set(generation, expiresAt);
  for (const listener of listeners) listener(generation);
}
export function onSessionRevoked(listener: (generation: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
