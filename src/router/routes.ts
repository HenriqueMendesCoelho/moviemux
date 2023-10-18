import { RouteRecordRaw } from 'vue-router';
import LoginPage from 'src/components/login/LoginPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '',
    component: () => import('src/layout/layoutWithoutSideBar/LayoutWithoutSideBar.vue'),
    children: [
      {
        path: '',
        component: LoginPage,
        name: 'login',
        meta: {
          roles: ['UNSECURE'],
          tags: {
            set: true,
            title: 'Cineminha - KronusBoss',
          },
        },
      },
      {
        path: '/password/change/:key',
        name: 'ChangePasswordForgotten',
        component: () => import('src/components/changeForgottenPassword/ChangeForgottenPassword.vue'),
        meta: {
          roles: ['UNSECURE'],
          tags: {
            set: true,
            title: 'Cineminha - Alterar Senha',
          },
        },
      },
      {
        path: '/login',
        redirect: () => {
          return { name: 'login' };
        },
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
          tags: {
            set: true,
            title: 'Cineminha - Página não encontrada',
          },
        },
      },
    ],
  },
  {
    path: '',
    component: () => import('src/layout/layoutWithSideBar/LayoutWithSideBar.vue'),
    children: [
      {
        path: '/home',
        component: () => import('src/components/home/HomePage.vue'),
        name: 'home',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Cineminha - Home',
          },
        },
      },
      {
        path: '/adm',
        component: () => import('src/components/administrator/AdministratorPage.vue'),
        name: 'adm',
        meta: {
          roles: ['ADM'],
          tags: {
            set: true,
            title: 'Cineminha - ADM',
          },
        },
      },
      {
        path: '/movie/:id',
        component: () => import('src/components/movie/MoviePage.vue'),
        name: 'movie',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: false,
          },
        },
      },
      {
        path: '/movie/add',
        component: () => import('src/components/movie/MoviePage.vue'),
        name: 'add',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Cineminha - Cadastrar Filme',
          },
        },
      },
      {
        path: '/profile',
        component: () => import('src/components/profile/ProfilePage.vue'),
        name: 'profile',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Cineminha - Perfil',
          },
        },
      },
      {
        path: '/movie/discover',
        component: () => import('src/components/discoverMovies/DiscoverMoviesPage.vue'),
        name: 'discoverMovies',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Cineminha - Descobrir',
          },
        },
      },
      {
        path: '/movie/wishlist/:id?',
        component: () => import('src/components/wishlist/WishlistPage.vue'),
        name: 'wishlist',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Cineminha - Lista de Filmes',
          },
        },
      },
      {
        path: '/movie/dashboard',
        component: () => import('src/components/charts/ChartsPage.vue'),
        name: 'charts',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Cineminha - Dashboard',
          },
        },
      },
    ],
  },
];

export default routes;
