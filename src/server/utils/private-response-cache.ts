import {
  getRequestURL,
  getRequestHeader,
  getResponseHeader,
  setResponseHeader,
  type H3Event,
} from 'h3';

export function protectPrivateResponse(event: H3Event) {
  const path = getRequestURL(event).pathname;
  if (path === '/ws' || path.startsWith('/ws/')) return;
  const api = path.startsWith('/api/');
  if (!api && !getRequestHeader(event, 'accept')?.includes('text/html')) return;
  // Nitro's 404 formatter overwrites earlier middleware cache headers. Apply
  // this policy at the final response boundary, including errors and redirects.
  setResponseHeader(event, 'cache-control', 'no-store, private');
  setResponseHeader(event, 'pragma', 'no-cache');
  if (api) setResponseHeader(event, 'x-content-type-options', 'nosniff');
  const vary = String(getResponseHeader(event, 'vary') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!vary.some((value) => value.toLowerCase() === 'cookie')) vary.push('Cookie');
  setResponseHeader(event, 'vary', vary.join(', '));
}
