<template>
  <section ref="panel" tabindex="-1" class="mm-auth-card mm-card" :aria-busy="loading">
    <LoginTab
      v-if="tab === 'login'"
      :create-account="createAccount"
      :registration-mode="registrationMode"
      @change-tab="changeTab"
      @loading="loading = $event"
    />
    <LoginCreateAccountTab
      v-else-if="tab === 'create' && createAccount"
      :registration-mode="registrationMode"
      @change-tab="changeTab"
      @loading="loading = $event"
      @refresh-mode="refreshMode"
    />
    <LoginWaitlistTab
      v-else-if="tab === 'waitlist' && createAccount"
      :enabled="registrationMode === 'WAITLIST'"
      :checking="checkingMode"
      @change-tab="changeTab"
      @loading="loading = $event"
      @refresh-mode="refreshMode"
    />
    <LoginForgotPasswordTab
      v-else
      :create-account="createAccount"
      @change-tab="changeTab"
      @loading="loading = $event"
    />
    <div v-if="createAccount && modeUnavailable" class="mm-muted">
      <p role="status">{{ t('account.registrationModeUnavailable') }}</p>
      <button
        type="button"
        class="mm-link"
        :disabled="loading || checkingMode"
        @click="refreshMode"
      >
        {{ t('account.checkRegistrationMode') }}
      </button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RegistrationMode } from '~/core/registration-mode';
import registration from '../services/RegistrationService';
import LoginWaitlistTab from './LoginWaitlistTab.vue';
import LoginTab from './LoginTab.vue';
import LoginCreateAccountTab from './LoginCreateAccountTab.vue';
import LoginForgotPasswordTab from './LoginForgotPasswordTab.vue';
const props = withDefaults(defineProps<{ createAccount?: boolean }>(), { createAccount: true });
const { t } = useI18n();
const registrationMode = ref<RegistrationMode | null>(null);
const checkingMode = ref(false);
const modeUnavailable = ref(false);
let current: AbortController | undefined;
let mounted = false;
const tab = defineModel<string>({ default: 'login' });
const loading = ref(false);
async function refreshMode() {
  if (!mounted || !props.createAccount) return;
  current?.abort();
  const request = new AbortController();
  current = request;
  checkingMode.value = true;
  modeUnavailable.value = false;
  // A failed or stale read cannot leave direct enrollment enabled.
  registrationMode.value = null;
  try {
    const mode = await registration.mode(request.signal);
    if (current === request && !request.signal.aborted) registrationMode.value = mode;
  } catch {
    if (current === request && !request.signal.aborted) modeUnavailable.value = true;
  } finally {
    if (current === request) checkingMode.value = false;
  }
}
function changeTab(value: string) {
  if (!props.createAccount && (value === 'create' || value === 'waitlist')) return;
  tab.value = value;
  if (value === 'create' || value === 'waitlist' || value === 'login') void refreshMode();
}
onMounted(() => {
  mounted = true;
  void refreshMode();
});
onBeforeUnmount(() => {
  mounted = false;
  current?.abort();
});
const emit = defineEmits<{ loading: [value: boolean] }>();
watch(loading, (value) => emit('loading', value));
const panel = ref<HTMLElement>();
watch(tab, async () => {
  await nextTick();
  const heading = panel.value?.querySelector<HTMLElement>('h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  } else panel.value?.focus();
});
</script>
<style scoped>
.mm-auth-card {
  width: 100%;
  max-width: 440px;
  padding: clamp(1.25rem, 2.5vw, 2rem);
}
.mm-auth-card :deep(.mm-form) {
  gap: 0.9rem;
}
.mm-auth-card :deep(.mm-form > header) {
  margin-bottom: 0.35rem;
}
.mm-auth-card :deep(.mm-form > header h2) {
  font-size: clamp(1.35rem, 2vw, 1.65rem);
  margin: 0.5rem 0;
}
.mm-auth-card :deep(.mm-form > header p) {
  margin: 0.5rem 0;
  line-height: 1.55;
}
.mm-auth-card :deep(.mm-form > header .mm-eyebrow) {
  font-size: 0.62rem;
  letter-spacing: 0.15em;
}
.mm-auth-card :deep(.mm-field) {
  gap: 0.45rem;
}
.mm-auth-card :deep(.mm-form > .mm-muted) {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
}
.mm-auth-card :deep(.mm-form > .mm-link) {
  justify-self: start;
  min-height: 36px;
}
</style>
