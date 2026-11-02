import { computed, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from 'src/core/stores/UserStore';
import { createRequestGate } from '../utils/RequestGate';

export function useMovieRequests() {
  const user = useUserStore();
  const route = useRoute();
  const sessionGeneration = computed(() => (user.user.isLoged ? user.user.generation : ''));
  const context = computed(() =>
    JSON.stringify([route.path, user.user.id, user.user.isLoged, sessionGeneration.value]),
  );
  const gate = createRequestGate(() => context.value);
  watch(context, () => gate.invalidate(), { flush: 'sync' });
  onBeforeUnmount(() => gate.dispose());
  return { ...gate, context, sessionGeneration };
}
