import { afterEach, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import type { StaticQueryCache } from 'src/core/query/StaticQueryClient';
const mocks = vi.hoisted(() => ({ user: { user: { id: 'a', generation: 'one', isLoged: true } } }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
afterEach(() => vi.unstubAllGlobals());

it('plugin clears synchronously on generation, account and unauthorized/logout transitions', async () => {
  vi.stubGlobal('defineNuxtPlugin', (setup: unknown) => setup);
  mocks.user = reactive({ user: { id: 'a', generation: 'one', isLoged: true } });
  const plugin = (await import('../../src/plugins/static-query.client')).default;
  let unmount!: () => void;
  const app = {
    vueApp: {
      use: vi.fn(),
      onUnmount: (callback: () => void) => {
        unmount = callback;
      },
    },
  };
  const setup = plugin as unknown as (input: typeof app) => {
    provide: { staticQuery: StaticQueryCache };
  };
  const cache = setup(app).provide.staticQuery;
  try {
    for (const change of [
      () => {
        mocks.user.user.generation = 'two';
      },
      () => {
        mocks.user.user.id = 'b';
      },
      () => {
        mocks.user.user.isLoged = false;
      },
    ]) {
      await cache.fetch('detail', ['title'], async () => 'old session');
      expect(cache.queryClient.getQueryCache().getAll()).toHaveLength(1);
      change();
      expect(cache.queryClient.getQueryCache().getAll()).toHaveLength(0);
    }
    await cache.fetch('detail', ['title'], async () => 'remaining');
    unmount();
    expect(cache.queryClient.getQueryCache().getAll()).toHaveLength(0);
  } finally {
    unmount();
  }
});
