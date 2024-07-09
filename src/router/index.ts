import { route } from 'quasar/wrappers';
import { Cookies, useMeta, Platform } from 'quasar';
import { RouteLocationNormalized, createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

import routes from './routes';
import { useUserStore } from 'src/core/stores/UserStore';
import { useStyleStore } from 'src/core/stores/StyleStore';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function (/* { store, ssrContext } */ { ssrContext }) {
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

    const cookies = process.env.SERVER ? Cookies.parseSSR(ssrContext) : Cookies;
    const token = cookies.get('auth-kb');
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

  Router.afterEach((to, from) => {
    setMetaTags(to);
    scrollTopOnRouteChange(to, from);
    if (Platform.is.mobile) {
      const styleStore = useStyleStore();
      styleStore.layoutSettings.isSideBarExpanded = false;
    }
  });

  return Router;
});

function setMetaTags(route: RouteLocationNormalized) {
  const defaultTitle = 'Cineminha - KronusBoss';
  const defaultDescription = 'Descubra o melhor do cinema, classificações e informações sobre filmes.';
  const defaultImage = 'https://img.cine.kronusboss.com/m3AJqU9tUmOpFgTb-VH3RlGd7tp6GD7QngPMqhSc/cine/kb_1200.png';
  const routeMeta = route.meta as {
    tags: {
      set: boolean;
      title?: string;
    };
  };

  const meta: { title?: string; meta: { [prop: string]: object } } = { title: undefined, meta: {} };

  if (routeMeta.tags.set) {
    meta['title'] = routeMeta.tags?.title || defaultTitle;
    meta.meta['title'] = { name: 'title', content: routeMeta.tags?.title || defaultTitle };
    meta.meta['description'] = { name: 'description', content: defaultDescription };

    meta.meta['ogTitle'] = { property: 'og:title', content: routeMeta.tags?.title || defaultTitle };
    meta.meta['ogDescription'] = { property: 'og:description', content: defaultDescription };
    meta.meta['ogImage'] = { property: 'og:image', content: defaultImage };

    meta.meta['twitterTitle'] = { property: 'twitter:title', content: routeMeta.tags?.title || defaultTitle };
    meta.meta['twitterDescription'] = { property: 'twitter:description', content: defaultDescription };
    meta.meta['twitterImage'] = { property: 'twitter:image', content: defaultImage };
  }
  useMeta(meta);
}

function scrollTopOnRouteChange(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  const toName = to.name?.toString() || '';
  const fromName = from.name?.toString() || '';
  if (!toName || !fromName) {
    return;
  }
  if (toName === fromName) {
    return;
  }

  const styleStore = useStyleStore();
  styleStore.scrollToContainer(0, 0, 'auto');
}
