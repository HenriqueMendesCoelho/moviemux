<template>
  <details ref="disclosure" class="mm-list-info" @toggle="syncListeners">
    <summary ref="trigger">{{ t('library.aboutList') }}</summary>
    <dl>
      <dt>{{ t('library.createdBy') }}</dt>
      <dd>{{ watchlist.user.name }}</dd>
      <dt>{{ t('library.movies') }}</dt>
      <dd>{{ watchlist.movies_wishlists?.length || 0 }}/100</dd>
      <dt>{{ t('library.creation') }}</dt>
      <dd>{{ DateUtils.toLocaleString(watchlist.created_at, locale) }}</dd>
      <dt>{{ t('library.update') }}</dt>
      <dd>{{ DateUtils.toLocaleString(watchlist.updated_at, locale) }}</dd>
    </dl>
  </details>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { onBeforeUnmount, ref } from 'vue';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

import DateUtils from 'src/core/utils/DateUtils';

interface Props {
  watchlist: WatchlistType;
}
defineProps<Props>();
const disclosure = ref<HTMLDetailsElement>();
const trigger = ref<HTMLElement>();
let listening = false;

function removeListeners() {
  document.removeEventListener('pointerdown', onOutsidePointer, true);
  document.removeEventListener('keydown', onEscape);
  document.removeEventListener('focusin', onFocusChange);
  listening = false;
}
function syncListeners() {
  if (!disclosure.value?.open) {
    removeListeners();
    return;
  }
  if (listening) return;
  document.addEventListener('pointerdown', onOutsidePointer, true);
  document.addEventListener('keydown', onEscape);
  document.addEventListener('focusin', onFocusChange);
  listening = true;
}
function dismiss(restoreFocus = false) {
  if (!disclosure.value?.open) return;
  disclosure.value.open = false;
  removeListeners();
  if (restoreFocus) trigger.value?.focus();
}
function isInside(target: EventTarget | null) {
  return target instanceof Node && !!disclosure.value?.contains(target);
}
function onOutsidePointer(event: PointerEvent) {
  if (!isInside(event.target)) dismiss();
}
function onFocusChange(event: FocusEvent) {
  if (!isInside(event.target)) dismiss();
}
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const restoreFocus = isInside(document.activeElement);
  if (restoreFocus) event.preventDefault();
  dismiss(restoreFocus);
}
onBeforeUnmount(removeListeners);
</script>

<style scoped>
.mm-list-info {
  font-size: 0.85rem;
  position: relative;
  max-width: 360px;
}
.mm-list-info summary {
  cursor: pointer;
  color: var(--mm-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 8px 0 0;
  position: absolute;
  width: min(300px, calc(100vw - 48px));
  left: 0;
  z-index: 15;
  border: 1px solid var(--mm-border);
  box-shadow: 0 12px 24px #0002;
  padding: 16px;
  background: var(--grey-dark2);
  border-radius: 12px;
}
dt {
  color: var(--mm-muted);
}
dd {
  margin: 0;
}
</style>
