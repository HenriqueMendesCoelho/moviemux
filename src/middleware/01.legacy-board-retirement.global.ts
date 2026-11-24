import { COLLECTIONS_PATH } from '~/core/collection-browser-paths';
import { isLegacyBoardPage } from '~/core/legacy-board-retirement';
import { legacyFilmHandoffMode } from '~/core/legacy-film-handoff';

export default defineNuxtRouteMiddleware((to) => {
  // Exactly four historical page records. Guard router-normalized variants too,
  // without intercepting Discover, Watchlist or the separate film-link resolver.
  if (!isLegacyBoardPage(to.name)) return;
  const mode = legacyFilmHandoffMode(useRuntimeConfig().public.legacyFilmHandoffEnabled);
  if (mode === 'off') return;
  if (import.meta.server) {
    useResponseHeader('cache-control').value = 'no-store, private';
    useResponseHeader('referrer-policy').value = 'no-referrer';
  }
  if (mode !== 'on') return abortNavigation(createError({ statusCode: 503 }));
  return navigateTo(COLLECTIONS_PATH, { redirectCode: 307, replace: true });
});
