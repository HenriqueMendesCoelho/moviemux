import { createApp } from 'vue';
import App from './App.vue';

import { router } from './routes';
import { createPinia } from 'pinia';

import { Quasar } from 'quasar';
import quasarUserOptions from './quasar-user-options';
import { autoAnimatePlugin } from '@formkit/auto-animate/vue';

import axiosConfig from './config/axiosConfig';

const app = createApp(App);

app.use(router);
app.use(createPinia());

app.use(Quasar, quasarUserOptions);
app.use(autoAnimatePlugin);

app.mount('#app');

// Configure axios Interceptors
axiosConfig.configAxios();
