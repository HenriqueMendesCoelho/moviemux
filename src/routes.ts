import LoginInit from "./components/login/LoginInit.vue";
import HomeApp from "./components/home/HomeApp.vue";
import AdministratorApp from "./components/administrator/AdministratorApp.vue";
import MovieApp from "./components/movie/MovieApp.vue";

export const routes = [
  { path: "/", name: "login", component: LoginInit, title: "Login" },
  { path: "/home", name: "home", component: HomeApp, title: "Home" },
  {
    path: "/adm",
    name: "adm",
    component: AdministratorApp,
    title: "Administrator",
  },
  { path: "/movie/:id", name: "movie", component: MovieApp, title: "Movie" },
  { path: "/add", name: "add", component: MovieApp, title: "AddMovie" },
];
