<template>
  <section ref="panel" tabindex="-1" class="mm-auth-card mm-card" :aria-busy="loading">
    <LoginTab
      v-if="tab === 'login'"
      :create-account="createAccount"
      @change-tab="tab = $event"
      @loading="loading = $event"
    />
    <LoginCreateAccountTab
      v-else-if="tab === 'create' && createAccount"
      @change-tab="tab = $event"
      @loading="loading = $event"
    />
    <LoginForgotPasswordTab
      v-else
      :create-account="createAccount"
      @change-tab="tab = $event"
      @loading="loading = $event"
    />
  </section>
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import LoginTab from './LoginTab.vue';
import LoginCreateAccountTab from './LoginCreateAccountTab.vue';
import LoginForgotPasswordTab from './LoginForgotPasswordTab.vue';
withDefaults(defineProps<{ createAccount?: boolean }>(), { createAccount: true });
const tab = defineModel<string>({ default: 'login' });
const loading = ref(false);
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
