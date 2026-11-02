import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { localDevApiProxy } from './config/local-dev-api';
const developmentApiProxy = localDevApiProxy(
  process.env.MOVIEMUX_DEV_API_ORIGIN,
  process.env.NODE_ENV === 'development',
);
const offlineAssets = ['offline.html', 'icons/icon-192x192.png'].map((asset) => ({
  url: `/${asset}`,
  revision: createHash('sha256')
    .update(readFileSync(`public/${asset}`))
    .digest('hex'),
}));
export default defineNuxtConfig({
  compatibilityDate: '2026-11-02',
  // Nuxt's development override is never applied to production builds.
  $development: developmentApiProxy
    ? {
        runtimeConfig: { public: { apiUrl: '/api' } },
        nitro: { devProxy: { '/api': developmentApiProxy } },
      }
    : {},
  srcDir: 'src/',
  dir: { app: '.' },
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  alias: { src: fileURLToPath(new URL('./src', import.meta.url)) },
  css: ['~/css/app.scss'],
  components: false,
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      apiUrl: process.env.CINE_BACKEND_URL || '',
      socketUrl: process.env.CINE_BACKEND_SOCKET_URL || '',
      tmdbImageBase: process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p',
    },
  },
  app: {
    head: {
      title: 'Movie Mux',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        {
          name: 'description',
          content: 'Seu universo de cinema. Descubra, avalie e organize os próximos filmes.',
        },
        { name: 'theme-color', content: '#0b0e14' },
      ],
      link: [{ rel: 'manifest', href: '/manifest.json' }],
    },
  },
  pwa: {
    registerType: 'prompt',
    manifest: false,
    workbox: {
      clientsClaim: true,
      additionalManifestEntries: offlineAssets,
      globPatterns: ['**/*.{js,css,png,svg,webp,ico,woff2}', 'offline.html'],
      navigateFallback: undefined,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Never persist authenticated HTML. Online navigation must reach Nitro;
          // only a network failure should show the precached offline notice.
          urlPattern: ({ request, url }) =>
            request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
          handler: 'NetworkOnly',
          options: { precacheFallback: { fallbackURL: '/offline.html' } },
        },
      ],
    },
    client: { installPrompt: true },
  },
  typescript: { strict: true },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData:
            '$breakpoint-xs-max: 599px; $breakpoint-sm-min: 600px; $breakpoint-sm-max: 1023px; $breakpoint-md-min: 1024px; $breakpoint-md-max: 1439px; $breakpoint-lg-min: 1440px; $primary: #00f6ff; $secondary: #5ce0c0; $accent: #c69aff; $dark: #111522; $positive: #5ce0c0; $negative: #ff7591; $info: #82c7ff; $warning: #ffd68a;',
        },
      },
    },
  },
});
