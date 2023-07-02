import { route } from 'quasar/wrappers';
import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

import routes from './routes';
import { useUserStore } from 'src/stores/UserStore';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, from, next) => {
    const loginStore = useUserStore();
    const user = loginStore.user;

    const token = localStorage.getItem('auth-kb');
    if (token) {
      loginStore.decodeToken(token);
    }

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
      next({ name: from.name || 'login', query: { from: to.fullPath } });
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

  return Router;
});
