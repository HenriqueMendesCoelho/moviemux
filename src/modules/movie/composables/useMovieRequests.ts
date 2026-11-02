import { computed, onBeforeUnmount, watch } from 'vue';
import { useCookie } from '#imports';
import { useRoute } from 'vue-router';
import { useUserStore } from 'src/core/stores/UserStore';
import { createRequestGate } from '../utils/RequestGate';

export function useMovieRequests() {
  const user = useUserStore();
  const route = useRoute();
  const token = useCookie<string | null>('auth-kb');
  const context = computed(() =>
    JSON.stringify([route.path, user.user.id, user.user.isLoged, token.value]),
  );
  const gate = createRequestGate(() => context.value);
  watch(context, () => gate.invalidate(), { flush: 'sync' });
  onBeforeUnmount(() => gate.dispose());
  return { ...gate, context, token };
}
