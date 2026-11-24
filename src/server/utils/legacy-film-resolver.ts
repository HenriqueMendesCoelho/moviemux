import { createError } from 'nuxt/server';
import { legacyFilmMappedLanding } from './legacy-film-link-contract';
export function legacyFilmResolverPath(path: string, method: string): boolean {
  return (
    method === 'GET' &&
    /^\/(?:rankings|movies\/collections)\/legacy-film-links\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      path,
    )
  );
}
export function invalidLegacyFilmLink(): never {
  throw createError({ status: 404, message: 'Link unavailable' });
}
export function legacyFilmResolverResponse(status: number, text: string) {
  if (status !== 200 || text.length > 256) invalidLegacyFilmLink();
  // Parse exact primitive wire members, rejecting duplicate keys before JSON parsing.
  const members = /^\s*\{([^{}]*)\}\s*$/.exec(text)?.[1]?.split(',');
  if (members?.length !== 2) invalidLegacyFilmLink();
  const fields = new Set<string>();
  for (const member of members) {
    const key = /^\s*"(ranking_id|entry_id)"\s*:\s*"[0-9a-f-]{36}"\s*$/.exec(member)?.[1];
    if (!key || fields.has(key)) invalidLegacyFilmLink();
    fields.add(key);
  }
  const data: unknown = JSON.parse(text);
  if (!legacyFilmMappedLanding(data)) invalidLegacyFilmLink();
  return { status: 200, data };
}
