import { computed, ref } from 'vue';
import { useRuntimeConfig } from '#imports';
export function useTurnstileForm() {
  const config = useRuntimeConfig().public;
  const enabled = config.turnstileEnabled !== false && String(config.turnstileEnabled) !== 'false';
  const token = ref('');
  const widget = ref<{ reset: () => void } | null>(null);
  const ready = computed(() => !enabled || Boolean(token.value));
  function reset() {
    token.value = '';
    widget.value?.reset();
  }
  return { token, widget, ready, reset };
}
