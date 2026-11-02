import { defineEventHandler } from 'nuxt/server';
/** Process liveness only: deliberately independent of authentication and upstream services. */
export default defineEventHandler((event) => {
  event.res.headers.set('cache-control', 'no-store');
  event.res.headers.set('x-content-type-options', 'nosniff');
  return { status: 'ok' };
});
