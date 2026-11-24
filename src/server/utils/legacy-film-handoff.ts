import {
  getCookie,
  getRequestHeader,
  setCookie,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3';
import { LEGACY_HISTORY_NOTICE } from '../../core/legacy-film-handoff';
import { COLLECTIONS_PATH } from '../../core/collection-browser-paths';
import {
  acceptsHtmlDocument,
  legacyFilmMappedLanding,
  legacyFilmPathId,
} from './legacy-film-link-contract';
import { isActiveSession, readActiveSession } from './session';
import { upstreamRequest } from './upstream';

function isHtmlNavigation(event: H3Event): boolean {
  if (event.node.req.method !== 'GET') return false;
  if (!acceptsHtmlDocument(getRequestHeader(event, 'accept'))) return false;
  const mode = getRequestHeader(event, 'sec-fetch-mode');
  const destination = getRequestHeader(event, 'sec-fetch-dest');
  if ((mode && mode !== 'navigate') || (destination && destination !== 'document')) return false;
  if (getRequestHeader(event, 'purpose') || getRequestHeader(event, 'sec-purpose')) return false;
  const length = getRequestHeader(event, 'content-length');
  return (!length || length === '0') && !getRequestHeader(event, 'transfer-encoding');
}

function neutralNotFound(event: H3Event): string {
  setResponseStatus(event, 404);
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8');
  const en = getCookie(event, 'moviemux-language') === 'en';
  return `<!doctype html><html lang="${en ? 'en' : 'pt-BR'}"><meta name="referrer" content="no-referrer"><title>Movie Mux</title><main><p>${en ? 'This link is unavailable.' : 'Este link está indisponível.'}</p></main></html>`;
}

/**
 * Operator-enabled handler. Enable only after separately reconciled ACTIVE cutover. The resolver also checks ACTIVE and current access authoritatively.
 */
export async function handleActiveLegacyFilmHandoff(
  event: H3Event,
  enabled = true,
): Promise<string | undefined> {
  const legacyId = legacyFilmPathId(event.node.req.url || '');
  if (!legacyId) return undefined;

  setResponseHeader(event, 'cache-control', 'no-store, private');
  setResponseHeader(event, 'referrer-policy', 'no-referrer');
  if (!enabled || !isHtmlNavigation(event)) return neutralNotFound(event);

  let landing: string | undefined;
  try {
    const session = await readActiveSession(event);
    const resolved = await upstreamRequest(`${COLLECTIONS_PATH}/legacy-film-links/${legacyId}`, {
      method: 'GET',
      token: session.secure.accessToken,
    });
    if (resolved.status === 200 && isActiveSession(session))
      landing = legacyFilmMappedLanding(resolved.data);
  } catch {
    // Credentials, denial details, invalid data and outages share one outcome.
    return neutralNotFound(event);
  }

  if (!landing) return neutralNotFound(event);
  setCookie(event, 'moviemux-history-moved', LEGACY_HISTORY_NOTICE, {
    path: COLLECTIONS_PATH,
    sameSite: 'lax',
    maxAge: 30,
    secure: process.env.NODE_ENV === 'production',
  });
  setResponseStatus(event, 307);
  // Suppress the browser's default inheritance of the original fragment.
  setResponseHeader(event, 'location', `${landing}#`);
  return '';
}
