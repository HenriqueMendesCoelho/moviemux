import { resolveApiBaseURL } from '~/core/resolveApiBaseURL';
import { createApiClient } from '~/core/createApiClient';
import { readBrowserAuthToken } from '~/core/session';
import { useUserStore } from '~/core/stores/UserStore';
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const token = useCookie<string | null>('auth-kb');
  const store = useUserStore();
  const requestOrigin = import.meta.server
    ? useRequestURL({ xForwardedHost: false, xForwardedProto: false }).origin
    : undefined;
  const api = createApiClient({
    baseURL: resolveApiBaseURL(config.public.apiUrl || undefined, requestOrigin),
    getToken: () => (import.meta.client ? readBrowserAuthToken() : token.value),
    onUnauthorized: () => {
      store.user.isLoged = false;
      if (import.meta.client) store.showDialogLogin = true;
    },
  });
  return { provide: { api, axios: api } };
});
