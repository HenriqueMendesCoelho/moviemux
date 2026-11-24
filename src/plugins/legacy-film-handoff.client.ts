import { legacyFilmHandoffMode, legacyFilmId } from '~/core/legacy-film-handoff';
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || legacyFilmHandoffMode(config.public.legacyFilmHandoffEnabled) === 'off')
      return;
    const id = legacyFilmId(window.location.pathname);
    if (id) window.location.replace(`/movie/${id}`);
  });
});
