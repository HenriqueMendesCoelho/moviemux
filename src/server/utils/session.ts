import { randomBytes } from 'node:crypto';
import { createError } from 'nuxt/server';
import { getUserSession } from '#auth-server';
import { isSessionRevoked } from './session-registry';
import type { SafeSessionUser } from '../../core/types/session-user';
export type { SafeSessionUser } from '../../core/types/session-user';
export interface ActiveSession {
  user: SafeSessionUser;
  secure: { accessToken: string };
  csrfToken: string;
}
/** Claims come only from the successful trusted upstream login, never browser-supplied JWTs. */
export function safeClaimsFromUpstream(token: string, now = Date.now()): SafeSessionUser {
  try {
    if (token.length > 2600) throw new Error('Oversized credential');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid credential');
    const data = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    const expiresAt = Number(data.exp) * 1000;
    if (
      !Number.isFinite(expiresAt) ||
      expiresAt <= now ||
      expiresAt > now + 31 * 86400000 ||
      typeof data.id !== 'string' ||
      !data.id ||
      data.id.length > 128 ||
      typeof data.name !== 'string' ||
      data.name.length > 160 ||
      typeof data.sub !== 'string' ||
      data.sub.length > 254 ||
      !Array.isArray(data.roles) ||
      data.roles.length > 12 ||
      !data.roles.every((role: unknown) => typeof role === 'string' && role.length <= 40)
    )
      throw new Error('Invalid claims');
    return {
      id: data.id,
      name: data.name,
      username: data.sub,
      roles: [...data.roles],
      expiresAt,
      generation: randomBytes(24).toString('base64url'),
    };
  } catch {
    throw createError({ status: 502, message: 'Invalid authentication response' });
  }
}
export function isActiveSession(session: unknown): session is ActiveSession {
  const data = session as Partial<ActiveSession> | undefined;
  return Boolean(
    data?.user &&
    typeof data.user.generation === 'string' &&
    data.user.expiresAt > Date.now() &&
    !isSessionRevoked(data.user.generation) &&
    typeof data.secure?.accessToken === 'string' &&
    data.secure.accessToken &&
    typeof data.csrfToken === 'string' &&
    data.csrfToken,
  );
}
export async function readActiveSession(
  event: Parameters<typeof getUserSession>[0],
): Promise<ActiveSession> {
  const session = await getUserSession(event);
  if (!isActiveSession(session)) throw createError({ status: 401, message: 'Session expired' });
  return session;
}
export function publicSession(session: ActiveSession) {
  const { id, name, username, roles, expiresAt, generation } = session.user;
  return {
    user: { id, name, username, roles: [...roles], expiresAt, generation },
    csrfToken: session.csrfToken,
  };
}
