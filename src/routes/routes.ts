import LoginInit from '@/components/login/LoginInit.vue';
import HomeApp from '@/components/home/HomeApp.vue';
import MovieApp from '@/components/movie/MovieApp.vue';

export const routes = [
  { path: '/', name: 'login', component: LoginInit, title: 'Login', meta: { sideBar: false } },
  { path: '/home', name: 'home', component: HomeApp, title: 'Home', meta: { sideBar: true } },
  {
    path: '/adm',
    name: 'adm',
    component: () => import('@/components/administrator/AdministratorPage.vue'),
    title: 'Administrator',
    meta: { sideBar: true },
  },
  { path: '/movie/:id', name: 'movie', component: MovieApp, title: 'Movie', meta: { sideBar: true } },
  { path: '/add', name: 'add', component: MovieApp, title: 'AddMovie', meta: { sideBar: true } },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/components/profile/ProfilePage.vue'),
    title: 'Profile',
    meta: { sideBar: true },
  },
  //{ path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/NotFound/NotFound.vue'),
    meta: { sideBar: false },
  },
];
