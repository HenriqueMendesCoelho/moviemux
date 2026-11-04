<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
useHead(() => ({
  htmlAttrs: { lang: locale.value === 'en' ? 'en' : 'pt-BR' },
  meta: [{ name: 'description', content: t('shell.description') }],
}));
import { useUserStore } from './core/stores/UserStore';
import AppFeedback from './core/layout/AppFeedback.vue';
import { useStyleStore } from './core/stores/StyleStore';
const style = useStyleStore();
const user = useUserStore();
const savedTheme = useCookie<string | null>('theme');
if (savedTheme.value) style.layoutSettings.darkMode = savedTheme.value === 'dark';
useHead(() => ({ htmlAttrs: { 'data-theme': style.layoutSettings.darkMode ? 'dark' : 'light' } }));
onMounted(() => style.initializeTheme());
</script>
<template>
  <NuxtLayout
    ><NuxtPage
      :key="user.user.generation || 'anonymous'"
      :keepalive="{ include: ['MovieMuxHomePage'], max: 1 }" /></NuxtLayout
  ><AppFeedback />
</template>
