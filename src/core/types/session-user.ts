export interface SafeSessionUser {
  id: string;
  name: string;
  username: string;
  roles: string[];
  expiresAt: number;
  generation: string;
}
