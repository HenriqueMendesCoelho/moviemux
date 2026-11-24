import { legacyFilmHandoffMode } from './legacy-film-handoff';

/** The same operator gate as the film handoff. It is not a backend phase probe. */
export function useLegacyBoardAvailable(): boolean {
  return legacyFilmHandoffMode(useRuntimeConfig().public.legacyFilmHandoffEnabled) === 'off';
}
