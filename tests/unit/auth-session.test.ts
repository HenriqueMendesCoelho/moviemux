import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { publicSession } from '../../src/core/session';
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('src/core/http', () => ({ default: http }));
import { useUserStore } from '../../src/core/stores/UserStore';
const session = () => ({
  user: {
    id: 'one',
    name: 'Name',
    username: 'email',
    roles: ['USER'],
    expiresAt: Date.now() + 60000,
    generation: 'generation-1',
  },
  csrfToken: 'csrf',
});
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});
describe('public session adapter', () => {
  it('whitelists fields and never stores private credentials', () => {
    const value = session();
    expect(
      publicSession({
        ...value,
        access_token: 'secret',
        secure: { jwt: 'secret' },
        user: { ...value.user, jwt: 'secret' },
      }),
    ).toEqual(value);
  });
  it('fails closed for expired or malformed claims', () => {
    expect(
      publicSession({ ...session(), user: { ...session().user, expiresAt: Date.now() - 1 } }),
    ).toEqual({});
    expect(publicSession({ ...session(), user: { ...session().user, roles: 'ADM' } })).toEqual({});
    expect(publicSession(null)).toEqual({});
  });
  it('logs in from safe response and changes generation on reauthentication', async () => {
    const store = useUserStore();
    http.post.mockResolvedValue({ data: session() });
    await store.login({ email: 'email', password: 'password' });
    expect(store.user.isLoged).toBe(true);
    expect(store.csrfToken).toBe('csrf');
    expect(store.user.generation).toBe('generation-1');
    store.applySession({ ...session(), user: { ...session().user, generation: 'generation-2' } });
    expect(store.user.generation).toBe('generation-2');
  });
  it('does not clear local identity until logout server confirmation', async () => {
    const store = useUserStore();
    store.applySession(session());
    http.post.mockRejectedValueOnce(new Error('offline'));
    await expect(store.logout()).rejects.toThrow('offline');
    expect(store.user.isLoged).toBe(true);
    http.post.mockResolvedValueOnce({ data: {} });
    await store.logout();
    expect(http.post).toHaveBeenLastCalledWith('/logout');
    expect(store.user.isLoged).toBe(false);
    expect(store.csrfToken).toBe('');
  });
  it('fetches official endpoint and clears stale identity for empty response', async () => {
    const store = useUserStore();
    store.applySession(session());
    http.get.mockResolvedValue({ data: {} });
    await store.fetchSession();
    expect(http.get).toHaveBeenCalledWith('/_auth/session');
    expect(store.user.isLoged).toBe(false);
    expect(store.sessionLoaded).toBe(true);
  });
});
