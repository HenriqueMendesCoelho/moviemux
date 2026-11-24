export const LEGACY_HISTORY_NOTICE = 'moved';
/** Explicit operator setting. Invalid configuration closes the legacy view. */
export function legacyFilmHandoffMode(value: unknown): 'off' | 'on' | 'unavailable' {
  if (value === false || value === 'false') return 'off';
  if (value === true || value === 'true') return 'on';
  return 'unavailable';
}
export function legacyFilmId(path: string): string | undefined {
  return /^\/movie\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(
    path,
  )?.[1];
}
