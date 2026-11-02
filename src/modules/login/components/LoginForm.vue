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
  max-width: 480px;
  padding: clamp(1.5rem, 4vw, 2.75rem);
}
</style>
