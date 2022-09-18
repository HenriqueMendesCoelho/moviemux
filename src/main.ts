import { createApp } from "vue";
import App from "./App.vue";

import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";

import { createPinia } from "pinia";

import VueSweetalert2 from "vue-sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { Quasar } from 'quasar'
import quasarUserOptions from './quasar-user-options'

const router = createRouter({
  history: createWebHistory(),
  routes,
});

createApp(App).use(Quasar, quasarUserOptions).use(router).use(VueSweetalert2).use(createPinia()).mount("#app");
