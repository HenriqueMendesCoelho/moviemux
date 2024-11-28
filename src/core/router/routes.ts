import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '',
    component: () => import('src/core/layout/public/PublicLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('src/modules/login/views/LoginView.vue'),
        name: 'login',
        meta: {
          roles: ['UNSECURE'],
          tags: {
            set: false,
            title: 'Movie Mux',
          },
        },
      },
      {
        path: '/password/change/:key',
        name: 'ChangePassword',
        component: () => import('src/modules/change-password/views/ChangePasswordView.vue'),
        meta: {
          roles: ['UNSECURE'],
          tags: {
            set: true,
            title: 'Movie Mux - Alterar Senha',
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
        component: () => import('src/modules/not-found/views/NotFoundView.vue'),
        meta: {
          roles: ['UNSECURE'],
          tags: {
            set: true,
            title: 'Movie Mux - Página não encontrada',
          },
        },
      },
    ],
  },
  {
    path: '',
    component: () => import('src/core/layout/app-with-nav/AppLayout.vue'),
    children: [
      {
        path: '/home',
        component: () => import('src/modules/movie-home/views/MovieHomeView.vue'),
        name: 'home',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Movie Mux - Home',
          },
        },
      },
      {
        path: '/adm',
        component: () => import('src/modules/administrator/views/AdministratorView.vue'),
        name: 'adm',
        meta: {
          roles: ['ADM'],
          tags: {
            set: true,
            title: 'Movie Mux - ADM',
          },
        },
      },
      {
        path: '/movie/:id',
        component: () => import('src/modules/movie/views/MovieView.vue'),
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
        component: () => import('src/modules/movie/views/MovieAddView.vue'),
        name: 'add',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Movie Mux - Cadastrar Filme',
          },
        },
      },
      {
        path: '/movie/edit/:id',
        component: () => import('src/modules/movie/views/MovieEditView.vue'),
        name: 'movie-edit',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: false,
          },
        },
      },
      {
        path: '/profile',
        component: () => import('src/modules/profile/views/ProfileView.vue'),
        name: 'profile',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Movie Mux - Perfil',
          },
        },
      },
      {
        path: '/movie/discover',
        component: () => import('src/modules/movie-discover/views/MovieDiscoverView.vue'),
        name: 'movie-discover',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Movie Mux - Descobrir Filmes',
          },
        },
      },
      {
        path: '/movie/watchlist',
        component: () => import('src/modules/movie-watchlist/views/MovieWatchlistsListView.vue'),
        name: 'movie-watchlist-list',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Movie Mux - Lista de Filmes',
          },
        },
      },
      {
        path: '/movie/watchlist/:id',
        component: () => import('src/modules/movie-watchlist/views/MovieWatchlistView.vue'),
        name: 'movie-watchlist-id',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: false,
          },
        },
      },
      {
        path: '/movie/dashboard',
        component: () => import('src/modules/movie-charts/views/MovieChartsView.vue'),
        name: 'movie-charts',
        meta: {
          roles: ['ADM', 'USER'],
          tags: {
            set: true,
            title: 'Movie Mux - Dashboard',
          },
        },
      },
    ],
  },
];

export default routes;
