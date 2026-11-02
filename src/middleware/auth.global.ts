import { useUserStore } from '~/core/stores/UserStore';
export default defineNuxtRouteMiddleware(async (to) => {
  const store = useUserStore();
  if (!store.sessionLoaded) await store.fetchSession();
  const roles = (to.meta.roles || ['UNSECURE']) as string[];
  if (roles.includes('UNSECURE')) return;
  if (!store.user.isLoged || store.user.expirationToken * 1000 <= Date.now()) {
    store.user.isLoged = false;
    return navigateTo({ name: 'login', query: { from: to.fullPath } });
  }
  if (!roles.some((role) => store.user.roles.includes(role))) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Acesso não permitido' }));
  }
});
