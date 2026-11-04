<template>
  <div v-if="enabled" class="mm-verification" :aria-busy="loading">
    <div ref="container" class="mm-verification-widget" />
    <p v-if="message" class="mm-muted" role="status" aria-live="polite">{{ t(message) }}</p>
    <button v-if="failed" class="mm-link" type="button" @click="retry">
      {{ t('shell.verificationRetry') }}
    </button>
    <noscript>{{ t('shell.verificationNoScript') }}</noscript>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRuntimeConfig } from '#imports';
import { useStyleStore } from 'src/core/stores/StyleStore';
import { loadTurnstile, type TurnstileApi, type TurnstileAction } from '../turnstile/client';
const props = defineProps<{ action: TurnstileAction }>();
const token = defineModel<string>({ default: '' });
const config = useRuntimeConfig().public;
const enabled = config.turnstileEnabled !== false && String(config.turnstileEnabled) !== 'false';
const style = enabled ? useStyleStore() : undefined;
const container = ref<HTMLElement | null>(null);
const loading = ref(true);
const failed = ref(false);
const message = ref('shell.verificationPreparing');
let api: TurnstileApi | undefined;
let widgetId: string | undefined;
let generation = 0;
let mounted = false;
let compact = false;
let observer: ResizeObserver | undefined;
function dispose() {
  generation++;
  token.value = '';
  if (widgetId !== undefined) api?.remove(widgetId);
  widgetId = undefined;
}
function expired() {
  token.value = '';
  loading.value = false;
  failed.value = true;
  message.value = 'shell.verificationExpired';
}
function error() {
  token.value = '';
  loading.value = false;
  failed.value = true;
  message.value = 'shell.verificationFailed';
}
async function render() {
  if (!enabled || !mounted) return;
  dispose();
  const current = generation;
  loading.value = true;
  failed.value = false;
  message.value = 'shell.verificationPreparing';
  try {
    api = await loadTurnstile();
    if (!mounted || current !== generation || !container.value) return;
    const active = () => mounted && current === generation;
    compact = container.value.clientWidth > 0 && container.value.clientWidth < 300;
    widgetId = api.render(container.value, {
      sitekey: String(config.turnstileSiteKey || ''),
      action: props.action,
      theme: style?.layoutSettings.darkMode ? 'dark' : 'light',
      size:
        container.value.clientWidth > 0 && container.value.clientWidth < 300
          ? 'compact'
          : 'flexible',
      language: locale.value === 'en' ? 'en' : 'pt-br',
      'response-field': false,
      callback: (value) => {
        if (!active()) return;
        token.value = value;
        loading.value = false;
        failed.value = false;
        message.value = 'shell.verificationComplete';
      },
      'expired-callback': () => {
        if (active()) expired();
      },
      'timeout-callback': () => {
        if (active()) expired();
      },
      'error-callback': () => {
        if (active()) error();
      },
    });
    loading.value = false;
    if (!token.value && !failed.value) message.value = 'shell.verificationRequired';
  } catch {
    if (mounted && current === generation) error();
  }
}
function reset() {
  token.value = '';
  if (!mounted || !enabled) return;
  // Invalidate captured callbacks before consuming this instance. Re-rendering gives
  // the next attempt a new callback generation even if an old iframe replies late.
  generation++;
  if (api && widgetId !== undefined) {
    try {
      api.reset(widgetId);
    } catch {
      /* A fresh instance below is the retry path. */
    }
  }
  void render();
}
watch(locale, () => {
  if (mounted && !token.value) void render();
});
function retry() {
  void render();
}
onMounted(() => {
  mounted = true;
  if (container.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      const width = container.value?.clientWidth || 0;
      if (widgetId !== undefined && width > 0 && width < 300 !== compact) void render();
    });
    observer.observe(container.value);
  }
  void render();
});
watch(
  () => [style?.layoutSettings.darkMode, props.action],
  async () => {
    if (!mounted) return;
    dispose();
    await nextTick();
    void render();
  },
);
onBeforeUnmount(() => {
  mounted = false;
  observer?.disconnect();
  dispose();
});
defineExpose({ reset });
</script>
<style scoped>
.mm-verification {
  min-width: 0;
  max-width: 100%;
}
.mm-verification-widget {
  min-height: 65px;
  width: 100%;
}
.mm-verification p {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
}
.mm-verification button {
  min-height: 44px;
}
</style>
