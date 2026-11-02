<template>
  <BaseModal
    v-model="visible"
    :title="options.title"
    :persistent="options.persistent"
    @hide="dismiss"
    ><p>{{ options.message }}</p>
    <footer class="mm-actions">
      <button
        ref="cancelButton"
        type="button"
        class="mm-button mm-button-ghost"
        @click="answer(false)"
      >
        {{ options.cancel }}</button
      ><button
        ref="okButton"
        type="button"
        class="mm-button mm-button-primary"
        @click="answer(true)"
      >
        {{ options.ok }}
      </button>
    </footer></BaseModal
  >
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue';
import BaseModal from './BaseModal.vue';
type Options = {
  message?: string;
  focus?: 'ok' | 'cancel' | 'none';
  title?: string;
  ok?: string;
  cancel?: string;
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
    focus: 'ok',
    title: 'Confirme',
    ok: 'Confirmar',
    cancel: 'Cancelar',
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
