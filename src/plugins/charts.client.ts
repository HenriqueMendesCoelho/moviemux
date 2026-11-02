import { defineAsyncComponent } from 'vue';
export default defineNuxtPlugin((app) => {
  app.vueApp.component(
    'apex-chart',
    defineAsyncComponent(() => import('vue3-apexcharts')),
  );
});
