import { defineEventHandler, deleteCookie } from 'nuxt/server';
import { clearUserSession } from '#auth-server';
export default defineEventHandler(async (event) => {
  await clearUserSession(event);
  deleteCookie(event, 'auth-kb', { path: '/' });
  return { loggedOut: true };
});
