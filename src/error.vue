<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { clearError } from '#app';
import { useHead } from '#imports';
import PublicLayout from '~/core/layout/public/PublicLayout.vue';
const props = defineProps<{ error: { statusCode?: number } }>();
const { t, locale } = useI18n();
const status = computed(() =>
  props.error.statusCode === 404 ? 404 : props.error.statusCode === 403 ? 403 : 500,
);
const titleKey = computed(() =>
  status.value === 404
    ? 'pages.notFound'
    : status.value === 403
      ? 'pages.accessDenied'
      : 'pages.errorTitle',
);
const messageKey = computed(() =>
  status.value === 404
    ? 'pages.notFoundMessage'
    : status.value === 403
      ? 'pages.accessDeniedMessage'
      : 'pages.errorMessage',
);
useHead(() => ({
  title: `Movie Mux - ${t(titleKey.value)}`,
  htmlAttrs: { lang: locale.value === 'en' ? 'en' : 'pt-BR' },
}));
function recover() {
  void clearError({ redirect: '/' });
}
</script>
<template>
  <PublicLayout>
    <section class="mm-error-page" aria-labelledby="error-title">
      <p class="mm-error-code" aria-hidden="true">{{ status }}</p>
      <h1 id="error-title">{{ t(titleKey) }}</h1>
      <p class="mm-muted">{{ t(messageKey) }}</p>
      <button type="button" class="mm-button mm-button-primary" @click="recover">
        {{ t('pages.backHome') }}
      </button>
    </section>
  </PublicLayout>
</template>
<style scoped>
.mm-error-page {
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 1rem;
}
.mm-error-page h1 {
  font-size: clamp(1.6rem, 4vw, 3rem);
  max-width: 24ch;
}
.mm-error-page p {
  max-width: 50ch;
}
.mm-error-code {
  font-size: clamp(4rem, 20vw, 8rem);
  line-height: 1;
  opacity: 0.35;
  margin: 0;
}
</style>
