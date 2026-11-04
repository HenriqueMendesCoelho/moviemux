<script setup lang="ts">
import { useCookie } from '#imports';
import { useI18n } from 'vue-i18n';
import { localeCookieName, normalizeLocale } from './locale';
const { t, locale, setLocale } = useI18n();
let switching = Promise.resolve();
const preference = useCookie(localeCookieName, {
  decode: normalizeLocale,
  sameSite: 'lax',
  maxAge: 31536000,
  path: '/',
});
async function change(event: Event) {
  const next = normalizeLocale((event.target as HTMLSelectElement).value);
  preference.value = next;
  switching = switching.catch(() => undefined).then(() => setLocale(next));
  await switching;
}
</script>
<template>
  <label class="mm-language-selector">
    <span>{{ t('shell.language') }}</span>
    <select
      :value="locale"
      :aria-label="t('shell.language')"
      @change="change"
      data-testid="language-selector"
    >
      <option value="pt-BR" lang="pt-BR">Português (Brasil)</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>
</template>
<style scoped>
.mm-language-selector {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  max-width: 100%;
}
select {
  font: inherit;
  color: inherit;
  background: var(--mm-surface, transparent);
  border: 1px solid var(--mm-border, #6f7a87);
  border-radius: 0.6rem;
  min-height: 44px;
  padding: 0.5rem;
  min-width: 0;
  max-width: 100%;
}
option {
  color: #111522;
  background: #fff;
}
</style>
