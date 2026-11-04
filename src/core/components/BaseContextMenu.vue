<template>
  <div
    ref="root"
    class="mm-context-menu"
    data-mm-context-menu
    @click.stop
    @keydown.esc.stop.prevent="dismiss(true)"
  >
    <button
      ref="trigger"
      type="button"
      class="mm-context-trigger"
      :aria-label="label"
      :title="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click.stop="toggle"
      @keydown.down.prevent="openFromTrigger"
      @keydown.up.prevent="openFromTrigger(true)"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="19" cy="12" r="1.7" />
      </svg>
    </button>
    <Teleport to="body">
      <Transition name="mm-context">
        <div
          v-if="open"
          :id="menuId"
          ref="panel"
          class="mm-context-options"
          role="menu"
          :aria-label="title || label"
          :style="position"
          @click.stop
          @click.capture="choose"
          @keydown="navigate"
          @pointermove="highlight"
          @contextmenu.prevent
        >
          <p v-if="title" class="mm-context-title" role="presentation">{{ title }}</p>
          <div class="mm-context-items"><slot /></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, onDeactivated, ref, useId, watch } from 'vue';
withDefaults(defineProps<{ label?: string; title?: string }>(), {
  label: 'Mais opções',
  title: '',
});
const menuId = `context-${useId()}`;
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const panel = ref<HTMLElement>();
const open = ref(false);
const position = ref({ left: '8px', top: '8px' });
let host: HTMLElement | null = null;
let anchor: { x: number; y: number } | null = null;
let returnFocus: HTMLElement | null = null;
let query = '';
let queryTimer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
function items() {
  return Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),a[href]:not([aria-disabled="true"]),[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
    ) || [],
  ).filter((item) => !item.hidden);
}
async function place() {
  await nextTick();
  if (!open.value || !panel.value) return;
  const rect = trigger.value?.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft || 0;
  const top = viewport?.offsetTop || 0;
  const width = viewport?.width || window.innerWidth;
  const height = viewport?.height || window.innerHeight;
  const panelWidth = panel.value.offsetWidth;
  const panelHeight = panel.value.offsetHeight;
  const x = anchor?.x ?? (rect?.right || left + 8) - panelWidth;
  const y = anchor?.y ?? (rect?.bottom || top + 8) + 6;
  position.value = {
    left: `${Math.max(left + 8, Math.min(x, left + width - panelWidth - 8))}px`,
    top: `${Math.max(top + 8, Math.min(y, top + height - panelHeight - 8))}px`,
  };
}
function dismiss(focus = false) {
  generation++;
  open.value = false;
  anchor = null;
  query = '';
  clearTimeout(queryTimer);
  if (focus) (returnFocus?.isConnected ? returnFocus : trigger.value)?.focus();
}
async function show(last = false) {
  const current = ++generation;
  document.dispatchEvent(new CustomEvent('mm:context-menu-open', { detail: root.value }));
  open.value = true;
  await place();
  if (!open.value || current !== generation) return;
  for (const item of panel.value?.querySelectorAll<HTMLElement>('button,a') || []) {
    item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
  }
  const available = items();
  available[last ? available.length - 1 : 0]?.focus();
}
function openFromTrigger(last: boolean | KeyboardEvent = false) {
  anchor = null;
  returnFocus = trigger.value || null;
  void show(last === true);
}
function toggle() {
  if (open.value) dismiss(true);
  else openFromTrigger();
}
function openAt(x: number, y: number) {
  anchor = { x, y };
  returnFocus = trigger.value || null;
  return show();
}
function context(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('input,textarea,[contenteditable="true"]')) return;
  event.preventDefault();
  event.stopPropagation();
  anchor = { x: event.clientX, y: event.clientY };
  returnFocus =
    (event.target as HTMLElement).closest<HTMLElement>('a,button,[tabindex]') ||
    trigger.value ||
    null;
  void show();
}
function hostKeys(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
  event.preventDefault();
  event.stopPropagation();
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  anchor = { x: rect.left, y: rect.bottom };
  returnFocus = target;
  void show();
}
function choose(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>('button,a,[role="menuitem"]');
  if (!target) return;
  if (target.matches(':disabled,[aria-disabled="true"]')) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  dismiss(true);
}
function highlight(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  const item = (event.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]');
  if (item && !item.matches(':disabled,[aria-disabled="true"]'))
    item.focus({ preventScroll: true });
}
function navigate(event: KeyboardEvent) {
  const available = items();
  const index = available.indexOf(document.activeElement as HTMLElement);
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    dismiss(true);
  } else if (event.key === 'Tab') dismiss(true);
  else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? available.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + available.length) % available.length;
    available[next]?.focus();
  } else if (event.key === ' ' && document.activeElement?.tagName === 'A') {
    event.preventDefault();
    (document.activeElement as HTMLAnchorElement).click();
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    query += event.key.toLocaleLowerCase();
    clearTimeout(queryTimer);
    queryTimer = setTimeout(() => {
      query = '';
    }, 600);
    available
      .find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(query))
      ?.focus();
  }
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node) && !panel.value?.contains(event.target as Node))
    dismiss();
}
function anotherMenu(event: Event) {
  if ((event as CustomEvent<HTMLElement>).detail !== root.value) dismiss();
}
function reposition() {
  if (open.value) void place();
}
watch(
  open,
  (value) => {
    if (value) {
      document.addEventListener('pointerdown', outside);
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true);
      window.visualViewport?.addEventListener('resize', reposition);
    } else {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
    }
  },
  { flush: 'sync' },
);
onMounted(() => {
  host = root.value?.closest<HTMLElement>('article') ?? root.value?.parentElement ?? null;
  host?.addEventListener('contextmenu', context);
  host?.addEventListener('keydown', hostKeys);
  document.addEventListener('mm:context-menu-open', anotherMenu);
});
onDeactivated(() => dismiss());
onBeforeUnmount(() => {
  dismiss();
  host?.removeEventListener('contextmenu', context);
  host?.removeEventListener('keydown', hostKeys);
  document.removeEventListener('mm:context-menu-open', anotherMenu);
});
defineExpose({ openAt, dismiss });
</script>
<style scoped>
.mm-context-menu {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.mm-context-trigger {
  width: 44px;
  height: 44px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--mm-muted);
  cursor: pointer;
  box-shadow: none;
}
.mm-context-trigger:hover,
.mm-context-trigger[aria-expanded='true'] {
  background: var(--mm-raised);
  color: var(--mm-text);
  border-color: var(--mm-border);
}
.mm-context-trigger:focus-visible {
  outline: 2px solid var(--mm-focus-ring);
  outline-offset: 2px;
}
.mm-context-options {
  position: fixed;
  z-index: 100;
  width: 240px;
  max-width: calc(100vw - 16px);
  max-height: min(420px, calc(100dvh - 16px));
  overflow: auto;
  overscroll-behavior: contain;
  background: var(--mm-surface);
  color: var(--mm-text);
  border: 1px solid var(--mm-border);
  border-radius: 14px;
  padding: 6px;
  box-shadow:
    0 16px 44px #0003,
    0 3px 10px #0002;
  transform-origin: top center;
}
.mm-context-title {
  padding: 7px 10px 9px;
  margin: 0 0 3px;
  border-bottom: 1px solid var(--mm-border);
  color: var(--mm-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-context-items :deep(button),
.mm-context-items :deep(a) {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  box-shadow: none;
  font: inherit;
  font-size: 0.85rem;
  line-height: 1.35;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transform: none;
}
.mm-context-items :deep(button:hover:not(:disabled)),
.mm-context-items :deep(a:hover),
.mm-context-items :deep([role='menuitem']:focus) {
  background: var(--mm-raised);
  outline: none;
}
.mm-context-items :deep([role='menuitem']:focus-visible) {
  outline: 2px solid var(--mm-focus-ring);
  outline-offset: -2px;
}
.mm-context-items :deep(:disabled),
.mm-context-items :deep([aria-disabled='true']) {
  opacity: 0.45;
  cursor: not-allowed;
}
.mm-context-items :deep(.mm-delete-list) {
  color: var(--mm-danger-text);
  border-top: 1px solid var(--mm-border);
  border-radius: 0 0 8px 8px;
}
.mm-context-enter-active,
.mm-context-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.mm-context-enter-from,
.mm-context-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.mm-context-leave-active {
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .mm-context-enter-active,
  .mm-context-leave-active {
    transition: none;
  }
}
</style>
