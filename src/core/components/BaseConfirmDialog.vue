<template>
  <BaseModal
    v-model="visible"
    :title="text(options.title) || t('components.confirmTitle')"
    :persistent="options.persistent"
    @hide="dismiss"
    ><p>{{ text(options.message) }}</p>
    <footer class="mm-actions">
      <button
        ref="cancelButton"
        type="button"
        class="mm-button mm-button-ghost"
        @click="answer(false)"
      >
        {{ text(options.cancel) || t('components.cancel') }}</button
      ><button
        ref="okButton"
        type="button"
        class="mm-button mm-button-primary"
        @click="answer(true)"
      >
        {{ text(options.ok) || t('components.confirm') }}
      </button>
    </footer></BaseModal
  >
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { nextTick, ref } from 'vue';
import BaseModal from './BaseModal.vue';
type DialogText = string | (() => string);
const text = (value?: DialogText) => (typeof value === 'function' ? value() : value);
type Options = {
  message?: DialogText;
  focus?: 'ok' | 'cancel' | 'none';
  title?: DialogText;
  ok?: DialogText;
  cancel?: DialogText;
  persistent?: boolean;
  event?: string;
};
const emit = defineEmits<{ ok: [value: void | string]; cancel: [value: void | string] }>();
const visible = ref(false),
  options = ref<Options>({}),
  okButton = ref<HTMLButtonElement>(),
  cancelButton = ref<HTMLButtonElement>();
let settled = false;
async function show(value: Options) {
  options.value = {
    focus: 'cancel',
    persistent: true,
    ...value,
  };
  settled = false;
  visible.value = true;
  await nextTick();
  await nextTick();
  if (options.value.focus === 'ok') okButton.value?.focus();
  else if (options.value.focus === 'cancel') cancelButton.value?.focus();
}
function answer(ok: boolean) {
  if (settled) return;
  settled = true;
  visible.value = false;
  if (ok) emit('ok', options.value.event);
  else emit('cancel', options.value.event);
}
function dismiss() {
  if (!settled) answer(false);
}
defineExpose({ show });
</script>
