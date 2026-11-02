import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const authServerModule = join(
  dirname(fileURLToPath(import.meta.resolve('nuxt-auth-utils'))),
  'runtime/server/utils/session.js',
);
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const offlineAssets = ['offline.html'].map((asset) => ({
  url: `/${asset}`,
  revision: createHash('sha256')
    .update(readFileSync(`public/${asset}`))
    .digest('hex'),
}));
export default defineNuxtConfig({
  compatibilityDate: '2026-11-02',
  srcDir: 'src/',
  serverDir: 'src/server',
  dir: { app: '.' },
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', 'nuxt-auth-utils'],
  auth: { loadStrategy: 'none' },
  nitro: { preset: 'node-server', experimental: { websocket: true } },
  alias: {
    src: fileURLToPath(new URL('./src', import.meta.url)),
    '#auth-server': authServerModule,
  },
  css: ['~/css/app.scss'],
  components: false,
  devtools: { enabled: false },
  runtimeConfig: {
    apiUpstream: '',
    socketUpstream: '',
    trustedOrigins: '',
    turnstileSecret: '',
    turnstileHostnames: '',
    session: {
      name: 'moviemux-session',
      maxAge: 3600,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      },
    },
    public: {
      turnstileSiteKey: '0x4AAAAAAFwyH9xyrHzMmwps',
      turnstileEnabled: true,
      apiUrl: '/api',
      socketUrl: '',
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
        // One SSR brand accent for link crawlers and browser chrome; dark surfaces stay in CSS.
        { name: 'theme-color', content: '#00f6ff' },
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
