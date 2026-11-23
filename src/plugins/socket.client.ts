import {
  initializeSockets,
  initializeMovieSocket,
  resetSocketSession,
  pausePrivateSockets,
  socketAllMovies,
  socketMovie,
} from '~/boot/socket';
import { isNeutralCollectionRoute } from '~/core/neutral-collection-route';
import { useUserStore } from '~/core/stores/UserStore';
import { useMovieStore } from '~/modules/movie/stores/MovieStore';
import { useMovieWatchlistStore } from '~/modules/movie-watchlist/stores/MovieWatchlistStore';
export default defineNuxtPlugin(() => {
  initializeSockets();
  initializeMovieSocket();
  const router = useRouter();
  const neutral = () => isNeutralCollectionRoute(router.currentRoute.value);
  const user = useUserStore();
  const movie = useMovieStore();
  const lists = useMovieWatchlistStore();
  let recovery: Promise<void> | undefined;
  const endSession = () => {
    if (recovery || neutral()) return;
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
  let lastPrivateGeneration: string | undefined;
  watch(
    [
      neutral,
      () => (neutral() ? '' : user.user.generation),
      () => !neutral() && user.user.isLoged,
      () => (neutral() ? '' : user.csrfToken),
    ],
    ([publicRoute, generation, loggedIn, csrf]) => {
      pausePrivateSockets(publicRoute);
      if (publicRoute) return;
      resetSocketSession(loggedIn ? csrf : '');
      if (
        lastPrivateGeneration !== undefined &&
        (lastPrivateGeneration !== generation || !loggedIn)
      ) {
        movie.$reset();
        lists.$reset();
      }
      lastPrivateGeneration = generation;
    },
    { immediate: true, flush: 'sync' },
  );
});
