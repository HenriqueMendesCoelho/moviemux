import { defineRouter } from '#q-app';
import { Cookies, useMeta, Platform } from 'quasar';
import type { RouteLocationNormalized } from 'vue-router';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

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

export default defineRouter(function (/* { store, ssrContext } */ { ssrContext }) {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, from) => {
    const loginStore = useUserStore();
    const user = loginStore.user;

    const cookies = import.meta.env.QUASAR_SERVER ? Cookies.parseSSR(ssrContext) : Cookies;
    const token = cookies.get('auth-kb');
    if (token) {
      loginStore.decodeToken(token);
    }

    if (!to.name) {
      return { name: 'login' };
    }

    const roles = to.meta.roles as Array<string>;
    const unsecureRoute = roles.some((r) => r === 'UNSECURE');

    if (unsecureRoute) {
      return true;
    }

    if (!user.isLoged && from.name !== 'login' && from.name !== 'notFound') {
      loginStore.showDialogLogin = true;
      return { name: from.name || 'login', query: { from: to.fullPath } };
    } else if (!user.isLoged) {
      return { name: 'login' };
    }

    const isAuthorized = roles.some((r) => user.roles.some((rU) => rU === r));

    return isAuthorized ? true : from;
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
  const defaultTitle = 'Movie Mux';
  const defaultDescription =
    'Descubra o melhor do cinema, classificações e informações sobre filmes.';
  const defaultImage =
    'https://img.moviemux.com/04VfS86K-_pAcjgaBHKzinmNiUp0gSD3VyuP0wjm/moviemux/MovieMux.webp';
  const routeMeta = route.meta as {
    tags: {
      set: boolean;
      title?: string;
    };
  };

  const meta: { title?: string | undefined; meta: { [prop: string]: object } } = {
    title: undefined,
    meta: {},
  };

  if (routeMeta.tags.set) {
    meta['title'] = routeMeta.tags?.title || defaultTitle;
    meta.meta['title'] = { name: 'title', content: routeMeta.tags?.title || defaultTitle };
    meta.meta['description'] = { name: 'description', content: defaultDescription };

    meta.meta['ogTitle'] = { property: 'og:title', content: routeMeta.tags?.title || defaultTitle };
    meta.meta['ogDescription'] = { property: 'og:description', content: defaultDescription };
    meta.meta['ogImage'] = { property: 'og:image', content: defaultImage };

    meta.meta['twitterTitle'] = {
      property: 'twitter:title',
      content: routeMeta.tags?.title || defaultTitle,
    };
    meta.meta['twitterDescription'] = {
      property: 'twitter:description',
      content: defaultDescription,
    };
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
