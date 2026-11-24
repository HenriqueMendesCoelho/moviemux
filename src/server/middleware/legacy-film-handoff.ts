import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from 'nuxt/server';
import { legacyFilmHandoffMode } from '../../core/legacy-film-handoff';
import { handleActiveLegacyFilmHandoff } from '../utils/legacy-film-handoff';

export default defineEventHandler(async (event) => {
  const mode = legacyFilmHandoffMode(useRuntimeConfig().public.legacyFilmHandoffEnabled);
  if (mode === 'off') return;
  return handleActiveLegacyFilmHandoff(event, mode === 'on');
});
