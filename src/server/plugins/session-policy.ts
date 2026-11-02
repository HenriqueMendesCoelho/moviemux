import { assertTurnstileMode } from '../utils/turnstile';
import { useRuntimeConfig } from 'nuxt/server';
import { defineNitroPlugin } from 'nitropack/runtime';
import { sessionHooks } from '#auth-server';
import { isActiveSession, publicSession } from '../utils/session';
import { trustedOrigins } from '../utils/security';
import { revokeSession } from '../utils/session-registry';
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  // Explicit local test mode must never disable protection on a public deployment.
  if (String(config.public.turnstileEnabled) === 'false') assertTurnstileMode();
  if (process.env.NODE_ENV === 'production' && String(config.appSecret || '').length < 32)
    throw new Error('NUXT_APP_SECRET must be a securely generated secret of at least32 characters');
  if (process.env.NODE_ENV === 'production' && config.session?.cookie?.secure === false) {
    const origins = trustedOrigins(String(config.trustedOrigins || ''));
    if (
      [...origins].some(
        (origin) => !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname),
      )
    )
      throw new Error(
        'Insecure session cookies are allowed only for explicitly configured loopback testing',
      );
  }
  sessionHooks.hook('clear', (session) => {
    if (session.user?.generation) revokeSession(session.user.generation, session.user.expiresAt);
  });
  sessionHooks.hook('fetch', (session, event) => {
    event.res.headers.set('cache-control', 'no-store, private');
    const safe = isActiveSession(session) ? publicSession(session) : {};
    // Whitelist public claims; no accidental future top-level secret can be serialized.
    for (const key of Object.keys(session)) delete session[key];
    Object.assign(session, safe);
  });
});
