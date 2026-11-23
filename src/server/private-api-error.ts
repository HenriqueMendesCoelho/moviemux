import { getRequestURL, send, setResponseHeaders, setResponseStatus } from 'h3';
import type { NitroErrorHandler } from 'nitropack/types';
import { protectPrivateResponse } from './utils/private-response-cache';

// Reuse Nitro's error sanitization, but enforce the private API cache policy
// after its formatter (which otherwise overwrites 404 cache-control).
const handler: NitroErrorHandler = async (error, event, { defaultHandler }) => {
  if (!getRequestURL(event).pathname.startsWith('/api/')) return;
  const response = await defaultHandler(error, event, { json: true });
  setResponseHeaders(event, response.headers);
  setResponseStatus(event, response.status, response.statusText);
  protectPrivateResponse(event);
  await send(event, JSON.stringify(response.body));
};
export default handler;
