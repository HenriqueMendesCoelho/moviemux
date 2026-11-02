/** Public session projection only. Credentials never enter application state. */
export interface PublicSessionUser {
  id: string;
  name: string;
  username: string;
  roles: string[];
  expiresAt: number;
  generation: string;
}
export interface PublicSession {
  user?: PublicSessionUser;
  csrfToken?: string;
}
export function publicSession(value: unknown): PublicSession {
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, unknown>;
  const user = input.user as Record<string, unknown> | undefined;
  if (
    !user ||
    typeof user.id !== 'string' ||
    !user.id ||
    typeof user.name !== 'string' ||
    typeof user.username !== 'string' ||
    !Array.isArray(user.roles) ||
    !user.roles.every((role) => typeof role === 'string') ||
    typeof user.expiresAt !== 'number' ||
    !Number.isFinite(user.expiresAt) ||
    user.expiresAt <= Date.now() ||
    typeof user.generation !== 'string' ||
    !user.generation
  )
    return {};
  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      roles: [...user.roles],
      expiresAt: user.expiresAt,
      generation: user.generation,
    },
    csrfToken: typeof input.csrfToken === 'string' ? input.csrfToken : '',
  };
}
