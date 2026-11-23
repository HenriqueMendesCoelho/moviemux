import {
  COLLECTIONS_PATH,
  collectionSignInReturnPath,
  legacyCollectionDestination,
} from '~/core/collection-browser-paths';
import { isNeutralCollectionRoute } from '~/core/neutral-collection-route';
import { useUserStore } from '~/core/stores/UserStore';
export default defineNuxtRouteMiddleware(async (to) => {
  const canonical = import.meta.client ? legacyCollectionDestination(to.path) : undefined;
  if (canonical) return navigateTo(canonical, { replace: true, redirectCode: 307 });
  if (isNeutralCollectionRoute(to)) return;
  const store = useUserStore();
  if (!store.sessionLoaded) await store.fetchSession();
  const roles = (to.meta.roles || ['UNSECURE']) as string[];
  if (roles.includes('UNSECURE')) return;
  if (!store.user.isLoged || store.user.expirationToken * 1000 <= Date.now()) {
    store.user.isLoged = false;
    const scoped = ['rankings', 'ranking-detail', 'ranking-join'].includes(String(to.name));
    const from = scoped ? collectionSignInReturnPath(to.path) || COLLECTIONS_PATH : to.fullPath;
    return navigateTo({ name: 'login', query: { from } });
  }
  if (!roles.some((role) => store.user.roles.includes(role))) {
    return abortNavigation(
      createError({ statusCode: 403, statusMessage: useNuxtApp().$i18n.t('shell.accessDenied') }),
    );
  }
});
