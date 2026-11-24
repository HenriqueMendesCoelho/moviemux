import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3';
import { useRuntimeConfig } from 'nuxt/server';
import { COLLECTIONS_PATH } from '../../core/collection-browser-paths';
import { isLegacyBoardPath } from '../../core/legacy-board-retirement';
import { legacyFilmHandoffMode } from '../../core/legacy-film-handoff';

export default defineEventHandler((event) => {
  const pathname = event.node.req.url?.split('?', 1)[0];
  if (!pathname || !isLegacyBoardPath(pathname)) return;
  const mode = legacyFilmHandoffMode(useRuntimeConfig().public.legacyFilmHandoffEnabled);
  if (mode === 'off') return;

  setResponseHeader(event, 'cache-control', 'no-store, private');
  setResponseHeader(event, 'referrer-policy', 'no-referrer');
  if (event.node.req.method !== 'GET') {
    setResponseStatus(event, 404);
    return '';
  }

  if (mode !== 'on') {
    setResponseStatus(event, 503);
    return '';
  }

  setResponseStatus(event, 307);
  // A fixed destination omits the obsolete query and replaces the old fragment.
  setResponseHeader(event, 'location', `${COLLECTIONS_PATH}#`);
  return '';
});
