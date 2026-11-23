import { defineEventHandler, getRequestHeader, setResponseHeader } from 'h3';
import { useRuntimeConfig } from 'nuxt/server';
import { protectPrivateResponse } from './private-response-cache';
import { publicRankingRequest, readPublicRanking } from './public-ranking-transport';

// Deliberately not a .get handler: some framework routes alias HEAD to GET.
export default defineEventHandler(async (event) => {
  protectPrivateResponse(event);
  const request = publicRankingRequest(
    event.node.req.method,
    event.node.req.url || '',
    getRequestHeader(event, 'content-length'),
    getRequestHeader(event, 'transfer-encoding'),
  );
  const result = await readPublicRanking(request, String(useRuntimeConfig().apiUpstream || ''));
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8');
  return result;
});
