<script setup lang="ts">
import { useCookie } from '#imports';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseSelect from '../components/BaseSelect.vue';
import { localeCookieName, normalizeLocale } from './locale';
const { t, locale, setLocale } = useI18n();
const selected = ref(locale.value);
const options = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
];
let switching = Promise.resolve();
let pending = 0;
watch(locale, (value) => {
  if (!pending) selected.value = value;
});
const preference = useCookie(localeCookieName, {
  decode: normalizeLocale,
  sameSite: 'lax',
  maxAge: 31536000,
  path: '/',
});
async function change(value: string) {
  const next = normalizeLocale(value);
  preference.value = next;
  pending++;
  switching = switching.catch(() => undefined).then(() => setLocale(next));
  try {
    await switching;
  } finally {
    pending--;
    if (!pending) selected.value = locale.value;
  }
}
</script>
<template>
  <BaseSelect
    v-model="selected"
    class="mm-language-selector"
    :label="t('shell.language')"
    :options="options"
    data-testid="language-selector"
    @change="change"
  />
</template>
<style scoped>
.mm-language-selector {
  width: 240px;
  max-width: 100%;
}
.mm-language-selector :deep(.mm-select-panel) {
  width: 100%;
  max-width: 100%;
}
</style>
