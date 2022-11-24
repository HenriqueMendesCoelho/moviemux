import { createApp } from 'vue';
import App from './App.vue';

import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes/routes';

import { createPinia } from 'pinia';

import VueSweetalert2 from 'vue-sweetalert2';
import { Quasar } from 'quasar';
import quasarUserOptions from './quasar-user-options';
import { autoAnimatePlugin } from '@formkit/auto-animate/vue';

import 'sweetalert2/dist/sweetalert2.min.css';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);

app.use(router);
app.use(createPinia());

app.use(Quasar, quasarUserOptions);
app.use(autoAnimatePlugin);
app.use(VueSweetalert2);

app.mount('#app');
