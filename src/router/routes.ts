import { RouteRecordRaw } from 'vue-router';
import HomePage from 'src/components/home/HomePage.vue';
import LoginPage from 'src/components/login/LoginPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '',
    component: () => import('src/layout/LayoutWithoutSideBar.vue'),
    children: [
      {
        path: '',
        component: LoginPage,
        name: 'login',
        meta: {
          roles: ['UNSECURE'],
        },
      },
      {
        path: '/password/change/:key',
        name: 'ChangePasswordForgotten',
        component: () => import('src/components/changeForgottenPassword/ChangeForgottenPassword.vue'),
        meta: {
          roles: ['UNSECURE'],
        },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'notFound',
        component: () => import('src/components/notFound/NotFound.vue'),
        meta: {
          roles: ['UNSECURE'],
        },
      },
    ],
  },
  {
    path: '',
    component: () => import('src/layout/LayoutWithSideBar.vue'),
    children: [
      {
        path: '/home',
        component: HomePage,
        name: 'home',
        meta: {
          roles: ['ADM', 'USER'],
        },
      },
      {
        path: '/adm',
        component: () => import('src/components/administrator/AdministratorPage.vue'),
        name: 'adm',
        meta: {
          roles: ['ADM'],
        },
      },
      {
        path: '/movie/:id',
        component: () => import('src/components/movie/MoviePage.vue'),
        name: 'movie',
        meta: {
          roles: ['ADM', 'USER'],
        },
      },
      {
        path: '/movie/add',
        component: () => import('src/components/movie/MoviePage.vue'),
        name: 'add',
        meta: {
          roles: ['ADM', 'USER'],
        },
      },
      {
        path: '/profile',
        component: () => import('src/components/profile/ProfilePage.vue'),
        name: 'profile',
        meta: {
          roles: ['ADM', 'USER'],
        },
      },
      {
        path: '/movie/discover',
        component: () => import('src/components/discoverMovies/DiscoverMoviesPage.vue'),
        name: 'discoverMovies',
        meta: {
          roles: ['ADM', 'USER'],
        },
      },
    ],
  },
];

export default routes;
