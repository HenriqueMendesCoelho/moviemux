import {
  createApiClient,
  createInternalApiAdapter,
  requestFetchBridge,
} from '~/core/createApiClient';
import { useUserStore } from '~/core/stores/UserStore';
export default defineNuxtPlugin(() => {
  const store = useUserStore();
  const requestFetch = import.meta.server ? useRequestFetch() : undefined;
  const api = createApiClient({
    getCsrfToken: () => store.csrfToken,
    getSessionGeneration: () => store.user.generation,
    adapter: requestFetch
      ? createInternalApiAdapter(
          requestFetchBridge((path, options) =>
            requestFetch(path, {
              ...options,
              method: options.method as
                'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
            }),
          ),
        )
      : undefined,
    onUnauthorized: () => {
      store.user.isLoged = false;
      if (import.meta.client) store.showDialogLogin = true;
    },
  });
  return { provide: { api, axios: api } };
});
