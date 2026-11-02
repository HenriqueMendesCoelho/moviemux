import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      src: root('./src'),
      '~': root('./src'),
      '@': root('./src'),
      '#imports': root('./tests/unit/nuxt-stubs.ts'),
      '#app': root('./tests/unit/nuxt-stubs.ts'),
    },
  },
  define: { 'import.meta.client': 'true', 'import.meta.server': 'false' },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts', 'src/**/__tests__/**/*.{test,spec}.ts'],
    setupFiles: ['./tests/unit/setup.ts'],
    restoreMocks: true,
  },
});
