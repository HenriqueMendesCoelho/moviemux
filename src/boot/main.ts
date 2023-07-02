import { boot } from 'quasar/wrappers';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue';

export default boot(({ app }) => {
  app.use(autoAnimatePlugin);
});
