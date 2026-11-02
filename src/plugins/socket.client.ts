import { initializeSockets, initializeMovieSocket, resetSocketSession } from '~/boot/socket';
import { useUserStore } from '~/core/stores/UserStore';
import { useMovieStore } from '~/modules/movie/stores/MovieStore';
import { useMovieWatchlistStore } from '~/modules/movie-watchlist/stores/MovieWatchlistStore';
import { readBrowserAuthToken } from '~/core/session';
export default defineNuxtPlugin(() => {
  const url = useRuntimeConfig().public.socketUrl;
  if (url) {
    initializeSockets(url);
    initializeMovieSocket(url);
  }
  const user = useUserStore();
  const movie = useMovieStore();
  const lists = useMovieWatchlistStore();
  watch(
    () => [user.user.id, user.user.isLoged] as const,
    (current, previous) => {
      resetSocketSession(current[1] ? readBrowserAuthToken() : '');
      if (previous && (current[0] !== previous[0] || !current[1])) {
        movie.$reset();
        lists.$reset();
      }
    },
    { immediate: true, flush: 'sync' },
  );
});
