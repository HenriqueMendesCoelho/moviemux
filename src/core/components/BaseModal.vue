<template>
  <dialog
    ref="dialog"
    class="mm-modal"
    :aria-labelledby="title ? titleId : undefined"
    :aria-label="title ? undefined : t('components.dialog')"
    :class="{ 'mm-modal-wide': wide }"
    @cancel="onCancel"
    @close="closed"
    @click="onBackdrop"
  >
    <div class="mm-modal-content">
      <header class="mm-modal-header">
        <h2 v-if="title" :id="titleId">{{ title }}</h2>
        <slot name="header" /><button
          type="button"
          class="mm-button mm-button-ghost"
          :aria-label="t('components.closeDialog')"
          @click="close"
        >
          ✕
        </button>
      </header>
      <slot />
    </div>
  </dialog>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { nextTick, onMounted, onBeforeUnmount, ref, watch, useId } from 'vue';
const props = withDefaults(
  defineProps<{ modelValue: boolean; title?: string; persistent?: boolean; wide?: boolean }>(),
  { persistent: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; hide: [] }>();
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
let returnFocus: HTMLElement | null = null;
async function sync() {
  await nextTick();
  if (props.modelValue && !dialog.value?.open) {
    returnFocus = document.activeElement as HTMLElement;
    dialog.value?.showModal();
  } else if (!props.modelValue && dialog.value?.open) dialog.value.close();
}
function close() {
  emit('update:modelValue', false);
  dialog.value?.close();
}
function closed() {
  emit('update:modelValue', false);
  emit('hide');
  returnFocus?.focus();
}
function onCancel(event: Event) {
  if (props.persistent) event.preventDefault();
  else close();
}
function onBackdrop(event: MouseEvent) {
  if (props.persistent || event.target !== dialog.value) return;
  const rect = dialog.value?.getBoundingClientRect();
  if (
    rect &&
    (event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom)
  )
    close();
}
watch(() => props.modelValue, sync);
onMounted(sync);
onBeforeUnmount(() => dialog.value?.close());
defineExpose({ close });
</script>
<style scoped>
.mm-modal {
  padding: 0;
  border: 1px solid var(--grey-mid);
  border-radius: 24px;
  background: var(--grey-dark2);
  color: var(--light-grey2);
  width: min(560px, calc(100vw - 32px));
  max-height: 90dvh;
  box-shadow: 0 24px 100px #0008;
}
.mm-modal::backdrop {
  background: #040810bf;
  backdrop-filter: blur(8px);
}
.mm-modal-wide {
  width: min(1100px, calc(100vw - 32px));
}
.mm-modal-content {
  padding: 24px;
}
.mm-modal-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.mm-modal-header h2 {
  margin: 0;
  flex: 1 1 180px;
  overflow-wrap: anywhere;
  min-width: 0;
}
.mm-modal-header > button:last-child {
  margin-left: auto;
  flex: 0 0 44px;
  width: 44px;
  min-height: 44px;
  padding-inline: 0;
}
</style>
