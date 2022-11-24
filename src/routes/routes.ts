import LoginInit from '@/components/login/LoginPage.vue';
import HomeApp from '@/components/home/HomePage.vue';
import MovieApp from '@/components/movie/MoviePage.vue';

export const routes = [
  {
    path: '/',

    component: () => import('@/layout/LayoutWithoutSideBar.vue'),
    children: [{ path: '', component: LoginInit, title: 'Login' }],
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/layout/LayoutWithSideBar.vue'),
    children: [{ path: '', component: HomeApp, name: 'login' }],
  },
  {
    path: '/adm',
    component: () => import('@/layout/LayoutWithSideBar.vue'),
    children: [{ path: '', component: () => import('@/components/administrator/AdministratorPage.vue'), name: 'adm' }],
  },
  {
    path: '/movie/:id',
    component: () => import('@/layout/LayoutWithSideBar.vue'),
    children: [{ path: '', component: MovieApp, name: 'movie' }],
  },
  {
    path: '/add',
    component: () => import('@/layout/LayoutWithSideBar.vue'),
    children: [{ path: '', component: MovieApp, name: 'add' }],
  },
  {
    path: '/profile',
    component: () => import('@/layout/LayoutWithSideBar.vue'),
    children: [{ path: '', component: () => import('@/components/profile/ProfilePage.vue'), name: 'profile' }],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/notFound/NotFound.vue'),
  },
];
