import { useUserStore } from '@/stores/UserStore';
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const loginStore = useUserStore();
  const user = loginStore.user;

  if (!to.name) {
    next({ name: 'login' });
    return;
  }

  const roles = to.meta.roles as Array<string>;
  const unsecureRoute = roles.some((r) => r === 'UNSECURE');

  if (unsecureRoute) {
    next();
    return;
  }

  if (!user.isLoged && from.name !== 'login' && from.name !== 'notFound') {
    loginStore.showDialogLogin = true;
    next(from);
    return;
  } else if (!user.isLoged) {
    next({ name: 'login' });
    return;
  }

  const isAuthorized = roles.some((r) => user.roles.some((rU) => rU === r));

  if (isAuthorized) {
    next();
  } else {
    next(from);
  }
});

export { router };
