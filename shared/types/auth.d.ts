import type { SafeSessionUser } from '../../src/core/types/session-user';
declare module '#auth-utils' {
  interface User {
    id: SafeSessionUser['id'];
    name: SafeSessionUser['name'];
    username: SafeSessionUser['username'];
    roles: SafeSessionUser['roles'];
    expiresAt: SafeSessionUser['expiresAt'];
    generation: SafeSessionUser['generation'];
  }
  interface SecureSessionData {
    accessToken: string;
  }
  interface UserSession {
    csrfToken?: string;
  }
}
export {};
