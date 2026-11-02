import { watch } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createStaticQueryClient } from '~/core/query/StaticQueryClient';
import { useUserStore } from '~/core/stores/UserStore';

export default defineNuxtPlugin((app) => {
  const cache = createStaticQueryClient();
  const user = useUserStore();
  app.vueApp.use(VueQueryPlugin, { queryClient: cache.queryClient, enableDevtoolsV6Plugin: false });
  const stop = watch(
    () => [user.user.id, user.user.generation, user.user.isLoged],
    () => cache.clear(),
    { flush: 'sync' },
  );
  app.vueApp.onUnmount(() => {
    stop();
    cache.clear();
  });
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      stop();
      cache.clear();
    });
  return { provide: { staticQuery: cache } };
});
