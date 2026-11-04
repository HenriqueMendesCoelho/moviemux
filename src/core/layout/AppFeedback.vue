<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, te } = useI18n();
import type { Notification, NotificationText } from '../utils/NotificationUtils';
const pwa = useNuxtApp().$pwa;
function notificationText(value: NotificationText) {
  if (typeof value === 'function') return value();
  return te(value) ? t(value) : value;
}
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
    <span class="mm-spinner" />{{
      loading.message
        ? te(loading.message)
          ? t(loading.message)
          : loading.message
        : t('components.loading')
    }}
  </div>
  <div class="mm-notifications" aria-live="polite">
    <article v-if="pwa?.needRefresh" class="mm-notice">
      <span>{{ t('components.newVersion') }}</span
      ><button @click="pwa.updateServiceWorker()">{{ t('components.update') }}</button
      ><button @click="pwa.cancelPrompt()" :aria-label="t('components.updateLater')">×</button>
    </article>
    <article v-for="n in notices" :key="n.id" :class="['mm-notice', n.kind]">
      <span>{{ notificationText(n.message) }}</span
      ><button
        v-if="n.action"
        @click="
          n.action.handler();
          remove(n.id);
        "
      >
        {{ notificationText(n.action.label) }}</button
      ><button :aria-label="t('components.closeNotification')" @click="remove(n.id)">×</button>
    </article>
  </div>
</template>
