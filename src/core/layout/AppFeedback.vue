<script setup lang="ts">
import type { Notification } from '../utils/NotificationUtils';
const pwa = useNuxtApp().$pwa;
const notices = ref<(Notification & { id: number })[]>([]);
const loading = ref({ active: false, message: '' });
let next = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
function remove(id: number) {
  notices.value = notices.value.filter((n) => n.id !== id);
}
function onNotice(event: Event) {
  const notice = { ...(event as CustomEvent<Notification>).detail, id: ++next };
  notices.value.push(notice);
  const timer = setTimeout(() => {
    remove(notice.id);
    timers.delete(timer);
  }, notice.timeout);
  timers.add(timer);
}
function onLoading(event: Event) {
  loading.value = (event as CustomEvent).detail;
}
onMounted(() => {
  window.addEventListener('moviemux:notification', onNotice);
  window.addEventListener('moviemux:loading', onLoading);
});
onBeforeUnmount(() => {
  window.removeEventListener('moviemux:notification', onNotice);
  window.removeEventListener('moviemux:loading', onLoading);
  timers.forEach(clearTimeout);
});
</script>
<template>
  <div v-if="loading.active" class="mm-loading" role="status">
    <span class="mm-spinner" />{{ loading.message || 'Carregando…' }}
  </div>
  <div class="mm-notifications" aria-live="polite">
    <article v-if="pwa?.needRefresh" class="mm-notice">
      <span>Uma nova versão está disponível.</span
      ><button @click="pwa.updateServiceWorker()">Atualizar</button
      ><button @click="pwa.cancelPrompt()" aria-label="Atualizar depois">×</button>
    </article>
    <article v-for="n in notices" :key="n.id" :class="['mm-notice', n.kind]">
      <span>{{ n.message }}</span
      ><button
        v-if="n.action"
        @click="
          n.action.handler();
          remove(n.id);
        "
      >
        {{ n.action.label }}</button
      ><button aria-label="Fechar notificação" @click="remove(n.id)">×</button>
    </article>
  </div>
</template>
