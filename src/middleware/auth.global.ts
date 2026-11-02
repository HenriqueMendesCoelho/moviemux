import { useUserStore } from '~/core/stores/UserStore';
export default defineNuxtRouteMiddleware((to) => {
  const store = useUserStore();
  store.decodeToken(useCookie<string | null>('auth-kb').value || '');
  const roles = (to.meta.roles || ['UNSECURE']) as string[];
  if (roles.includes('UNSECURE')) return;
  if (!store.user.isLoged) return navigateTo({ name: 'login', query: { from: to.fullPath } });
  if (!roles.some((role) => store.user.roles.includes(role))) {
    store.logout();
    return navigateTo({ name: 'login', query: { reason: 'forbidden' } });
  }
});
