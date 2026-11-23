import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3';
import { legacyCollectionDestination } from '../../core/collection-browser-paths';

export default defineEventHandler((event) => {
  const pathname = event.node.req.url?.split('?', 1)[0];
  const destination = pathname && legacyCollectionDestination(pathname);
  if (!destination) return;

  setResponseHeader(event, 'cache-control', 'no-store, private');
  setResponseHeader(event, 'referrer-policy', 'no-referrer');
  if (event.node.req.method !== 'GET') {
    setResponseStatus(event, 404);
    return '';
  }

  setResponseStatus(event, 307);
  // An explicit empty fragment prevents HTTP user agents from carrying the old
  // URL's fragment onto the new page. Query strings are never forwarded.
  setResponseHeader(event, 'location', `${destination}#`);
  return '';
});
