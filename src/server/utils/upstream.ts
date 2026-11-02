import { createError, useRuntimeConfig } from 'nuxt/server';
import { fixedUpstream } from './security';

const uuid = '[a-zA-Z0-9_-]{1,128}';
const rules: Array<[RegExp, string[]]> = [
  [/^\/public\/user$/, ['POST']],
  [/^\/public\/user\/password\/reset$/, ['POST']],
  [new RegExp(`^/public/user/password/${uuid}/reset$`), ['POST']],
  [/^\/public\/movie\/tmdb\/\d+\/info$/, ['GET']],
  [/^\/user$/, ['GET']],
  [/^\/user\/(?:update|p\/update)$/, ['PATCH']],
  [/^\/user\/wishlist$/, ['GET', 'POST']],
  [new RegExp(`^/user/wishlist/${uuid}$`), ['GET', 'PATCH']],
  [new RegExp(`^/user/wishlist/${uuid}/movies-rated$`), ['GET']],
  [new RegExp(`^/user/wishlist/${uuid}/update$`), ['PUT']],
  [new RegExp(`^/user/wishlist/${uuid}/delete$`), ['DELETE']],
  [/^\/restricted\/user$/, ['GET']],
  [/^\/restricted\/user\/invite$/, ['GET', 'POST']],
  [new RegExp(`^/restricted/user/invite/${uuid}/delete$`), ['DELETE']],
  [/^\/restricted\/user\/[a-zA-Z0-9@._+%-]{1,254}$/, ['GET', 'DELETE']],
  [new RegExp(`^/restricted/user/${uuid}/(?:promote|demote|block)$`), ['PATCH']],
  [new RegExp(`^/restricted/discord/${uuid}$`), ['POST', 'PATCH']],
  [/^\/movie$/, ['GET', 'POST']],
  [/^\/movie\/(?:genres|genres-with-movies)$/, ['GET']],
  [/^\/movie\/note$/, ['POST']],
  [new RegExp(`^/movie/note/${uuid}$`), ['GET']],
  [new RegExp(`^/movie/note/${uuid}/update$`), ['PATCH']],
  [new RegExp(`^/movie/note/${uuid}/delete$`), ['DELETE']],
  [/^\/movie\/tmdb(?:\/(?:popular|now-playing|upcoming|top-rated|discover))?$/, ['GET']],
  [/^\/movie\/tmdb\/\d+\/(?:summary|recommendations|similar|watch-providers|credits)$/, ['GET']],
  [new RegExp(`^/movie/${uuid}$`), ['GET']],
  [new RegExp(`^/movie/${uuid}/update$`), ['PUT']],
  [new RegExp(`^/movie/${uuid}/delete$`), ['DELETE']],
  [/^\/statistic\/movies$/, ['GET']],
];
export function allowedApiPath(path: string, method: string): boolean {
  if (path.includes('..') || path.includes('\\') || /%(?:2f|5c|2e|25)/i.test(path)) return false;
  return rules.some(([pattern, methods]) => pattern.test(path) && methods.includes(method));
}
export async function upstreamRequest(
  path: string,
  options: { method: string; body?: string; contentType?: string; token?: string },
) {
  const base = fixedUpstream(String(useRuntimeConfig().apiUpstream || ''));
  const target = new URL(`${base.pathname.replace(/\/$/, '')}${path}`, base.origin);
  if (target.origin !== base.origin)
    throw createError({ status: 400, message: 'Invalid API path' });
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.contentType) headers['content-type'] = options.contentType;
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let response: Response;
  try {
    response = await fetch(target, {
      method: options.method,
      headers,
      body: options.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw createError({ status: 502, message: 'API unavailable' });
  }
  if (response.status >= 300 && response.status < 400)
    throw createError({ status: 502, message: 'Unexpected API redirect' });
  const reader = response.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        throw createError({ status: 502, message: 'API response too large' });
      }
      chunks.push(value);
    }
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!response.ok) {
    // Never reflect upstream bodies/errors: they may contain credentials or request headers.
    throw createError({
      status: [400, 401, 403, 404, 409, 422, 429].includes(response.status) ? response.status : 502,
      message:
        response.status === 401
          ? 'Session expired'
          : response.status === 403
            ? 'Access denied'
            : 'API request failed',
    });
  }
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw createError({ status: 502, message: 'Invalid API response' });
  }
  return { status: response.status, data };
}
