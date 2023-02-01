import { createApp } from 'vue';
import App from './App.vue';

import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes/routes';

import { createPinia } from 'pinia';

import { Quasar } from 'quasar';
import quasarUserOptions from './quasar-user-options';
import { autoAnimatePlugin } from '@formkit/auto-animate/vue';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);

app.use(router);
app.use(createPinia());

app.use(Quasar, quasarUserOptions);
app.use(autoAnimatePlugin);

app.mount('#app');
