import {
  initializeSockets,
  initializeMovieSocket,
  resetSocketSession,
  socketAllMovies,
  socketMovie,
} from '~/boot/socket';
import { useUserStore } from '~/core/stores/UserStore';
import { useMovieStore } from '~/modules/movie/stores/MovieStore';
import { useMovieWatchlistStore } from '~/modules/movie-watchlist/stores/MovieWatchlistStore';
export default defineNuxtPlugin(() => {
  initializeSockets();
  initializeMovieSocket();
  const user = useUserStore();
  const movie = useMovieStore();
  const lists = useMovieWatchlistStore();
  let recovery: Promise<void> | undefined;
  const endSession = () => {
    if (recovery) return;
    user.applySession(null);
    recovery = user
      .fetchSession()
      .catch(() => {
        user.applySession(null);
      })
      .finally(() => {
        recovery = undefined;
      });
  };
  const connectionError = (error: Error & { data?: { code?: string } }) => {
    if (error.data?.code === 'SESSION_REQUIRED') endSession();
  };
  socketAllMovies.on('connect_error', connectionError);
  socketMovie.on('connect_error', connectionError);
  socketAllMovies.on('bridge:session-ended', endSession);
  socketMovie.on('bridge:session-ended', endSession);
  watch(
    () => [user.user.generation, user.user.isLoged, user.csrfToken] as const,
    (current, previous) => {
      resetSocketSession(current[1] ? current[2] : '');
      if (previous && (current[0] !== previous[0] || !current[1])) {
        movie.$reset();
        lists.$reset();
      }
    },
    { immediate: true, flush: 'sync' },
  );
});
