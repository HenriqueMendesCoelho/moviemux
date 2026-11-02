<template>
  <details
    ref="menu"
    class="mm-context-menu"
    data-mm-context-menu
    @click.stop
    @toggle="onToggle"
    @keydown.esc.stop.prevent="dismiss(true)"
  >
    <summary ref="trigger" aria-label="Mais opções" class="mm-button mm-button-ghost">•••</summary>
    <div ref="panel" class="mm-context-options" :style="position" @click.capture="choose">
      <slot />
    </div>
  </details>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref } from 'vue';
const menu = ref<HTMLDetailsElement>(),
  panel = ref<HTMLElement>(),
  trigger = ref<HTMLElement>();
const position = ref({ left: '0px', top: '0px' });
let host: HTMLElement | null = null;
let anchor: { x: number; y: number } | null = null;
async function place() {
  await nextTick();
  if (!menu.value?.open || !panel.value) return;
  const rect = trigger.value?.getBoundingClientRect();
  const width = panel.value.offsetWidth,
    height = panel.value.offsetHeight;
  const x = anchor?.x ?? rect?.left ?? 8,
    y = anchor?.y ?? rect?.bottom ?? 8;
  position.value = {
    left: `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`,
    top: `${Math.max(8, Math.min(y, window.innerHeight - height - 8))}px`,
  };
}
function dismiss(focus = false) {
  menu.value?.removeAttribute('open');
  anchor = null;
  if (focus) trigger.value?.focus();
}
function choose(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('button,a')) dismiss();
}
function onToggle() {
  if (menu.value?.open) void place();
  else anchor = null;
}
async function openAt(x: number, y: number) {
  anchor = { x, y };
  menu.value?.setAttribute('open', '');
  await place();
  panel.value?.querySelector<HTMLElement>('button:not(:disabled),a[href]')?.focus();
}
function context(event: MouseEvent) {
  event.preventDefault();
  void openAt(event.clientX, event.clientY);
}
function outside(event: PointerEvent) {
  if (menu.value?.open && !menu.value.contains(event.target as Node)) dismiss();
}
function reposition() {
  if (menu.value?.open) void place();
}
onMounted(() => {
  host = menu.value?.closest<HTMLElement>('article') ?? menu.value?.parentElement ?? null;
  host?.addEventListener('contextmenu', context);
  document.addEventListener('pointerdown', outside);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
});
onBeforeUnmount(() => {
  host?.removeEventListener('contextmenu', context);
  document.removeEventListener('pointerdown', outside);
  window.removeEventListener('resize', reposition);
  window.removeEventListener('scroll', reposition, true);
});
defineExpose({ openAt });
</script>
<style scoped>
.mm-context-menu {
  position: relative;
  display: inline-block;
}
.mm-context-menu summary {
  list-style: none;
  cursor: pointer;
}
.mm-context-menu summary::-webkit-details-marker {
  display: none;
}
.mm-context-options {
  position: fixed;
  z-index: 60;
  min-width: 190px;
  max-width: calc(100vw - 16px);
  max-height: calc(100dvh - 16px);
  overflow: auto;
  display: grid;
  background: var(--grey-dark2);
  border: 1px solid var(--grey-mid);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 16px 50px #0006;
}
</style>
