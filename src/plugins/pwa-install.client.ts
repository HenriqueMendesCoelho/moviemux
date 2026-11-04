import { createPwaInstallController } from '~/core/pwa/InstallController';
export default defineNuxtPlugin((app) => {
  const controller = createPwaInstallController(window);
  app.vueApp.onUnmount(controller.dispose);
  if (import.meta.hot) import.meta.hot.dispose(controller.dispose);
  return { provide: { pwaInstall: controller } };
});
