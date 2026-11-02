<template>
  <div
    ref="root"
    class="mm-single-select"
    @keydown.esc.stop.prevent="close(true)"
    @focusout="onFocusOut"
  >
    <span :id="`${id}-label`" class="mm-select-label">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      role="combobox"
      class="mm-select-trigger"
      :disabled="disabled"
      :aria-labelledby="`${id}-label ${id}-value`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      @click="open ? close(false) : show()"
      @keydown.down.prevent="show()"
      @keydown.up.prevent="show()"
      @keydown="typeahead"
    >
      <span :id="`${id}-value`" class="mm-select-value">{{ summary }}</span>
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <Transition name="mm-select-panel">
      <div
        v-if="open"
        :id="`${id}-list`"
        class="mm-select-panel"
        role="listbox"
        :aria-labelledby="`${id}-label`"
        :class="{ 'mm-select-above': above, 'mm-select-right': alignRight }"
        :style="{ maxHeight: `${height}px` }"
        @keydown="typeahead"
      >
        <button
          v-for="(option, index) in options"
          :key="option.value"
          type="button"
          role="option"
          class="mm-select-option"
          :aria-selected="model === option.value"
          :tabindex="index === activeIndex ? 0 : -1"
          :data-option-index="index"
          @focus="activeIndex = index"
          @click="choose(option.value)"
          @keydown.down.prevent="focusOption((index + 1) % options.length)"
          @keydown.up.prevent="focusOption((index - 1 + options.length) % options.length)"
          @keydown.home.prevent="focusOption(0)"
          @keydown.end.prevent="focusOption(options.length - 1)"
        >
          <span>{{ option.label }}</span>
          <svg
            v-if="model === option.value"
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue';
const props = withDefaults(
  defineProps<{ label: string; options: { value: string; label: string }[]; disabled?: boolean }>(),
  { disabled: false },
);
const model = defineModel<string>({ default: '' });
const emit = defineEmits<{ change: [value: string] }>();
const id = `mm-single-select-${useId()}`;
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const open = ref(false);
const activeIndex = ref(0);
const above = ref(false);
const alignRight = ref(false);
const height = ref(380);
const summary = computed(
  () => props.options.find((option) => option.value === model.value)?.label || 'Selecionar',
);
let listening = false;
let typed = '';
let typedAt = 0;
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');
function position() {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) return;
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop || 0;
  const bottom = top + (viewport?.height || window.innerHeight);
  const below = Math.max(0, bottom - rect.bottom - 16);
  const availableAbove = Math.max(0, rect.top - top - 16);
  above.value = below < 240 && availableAbove > below;
  height.value = Math.min(380, above.value ? availableAbove : below);
  alignRight.value = rect.left + 280 > window.innerWidth - 16;
}
async function show() {
  if (props.disabled || !props.options.length) return;
  position();
  open.value = true;
  await nextTick();
  if (open.value)
    focusOption(
      Math.max(
        0,
        props.options.findIndex((option) => option.value === model.value),
      ),
    );
}
function close(restore: boolean) {
  open.value = false;
  typed = '';
  if (restore) trigger.value?.focus();
}
function focusOption(index: number) {
  if (index < 0 || index >= props.options.length) return;
  activeIndex.value = index;
  root.value?.querySelector<HTMLElement>(`[data-option-index="${index}"]`)?.focus();
}
function choose(value: string) {
  if (model.value !== value) {
    model.value = value;
    emit('change', value);
  }
  close(true);
}
async function typeahead(event: KeyboardEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1 || event.key === ' ')
    return;
  event.preventDefault();
  const now = Date.now();
  typed = now - typedAt > 700 ? event.key : typed + event.key;
  typedAt = now;
  const needle = normalize(typed);
  const index = props.options.findIndex((option) => normalize(option.label).startsWith(needle));
  if (!open.value) await show();
  if (index >= 0 && open.value) focusOption(index);
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close(false);
}
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget && !root.value?.contains(event.relatedTarget as Node)) close(false);
}
function reposition() {
  if (open.value) position();
}
function attach() {
  if (listening) return;
  listening = true;
  document.addEventListener('pointerdown', outside);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  window.visualViewport?.addEventListener('resize', reposition);
}
function detach() {
  if (!listening) return;
  listening = false;
  document.removeEventListener('pointerdown', outside);
  window.removeEventListener('resize', reposition);
  window.removeEventListener('scroll', reposition, true);
  window.visualViewport?.removeEventListener('resize', reposition);
}
watch(
  () => props.disabled,
  (value) => {
    if (value) close(false);
  },
);
onMounted(attach);
onActivated(attach);
onDeactivated(() => {
  close(false);
  detach();
});
onBeforeUnmount(detach);
</script>
<style scoped>
.mm-single-select {
  position: relative;
  min-width: 0;
  width: 100%;
}
.mm-select-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mm-muted);
}
.mm-select-trigger {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 44px;
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  color: var(--mm-text);
  background: var(--mm-surface);
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
}
.mm-select-trigger:hover,
.mm-select-trigger[aria-expanded='true'] {
  border-color: var(--mm-link);
}
.mm-select-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-select-trigger > svg {
  flex-shrink: 0;
}
.mm-select-panel {
  position: absolute;
  z-index: 45;
  top: calc(100% + 8px);
  left: 0;
  width: max(100%, 250px);
  max-width: calc(100vw - 48px);
  padding: 0.5rem;
  border: 1px solid var(--mm-border);
  border-radius: 14px;
  background: var(--mm-surface);
  box-shadow: 0 14px 40px #0003;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--mm-border) transparent;
}
.mm-select-panel.mm-select-above {
  top: auto;
  bottom: calc(100% + 8px);
}
.mm-select-panel.mm-select-right {
  left: auto;
  right: 0;
}
.mm-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.65rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--mm-text);
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
}
.mm-select-option > svg {
  flex-shrink: 0;
  color: var(--mm-link);
}
.mm-select-option:hover,
.mm-select-option:focus-visible {
  background: var(--mm-raised);
}
.mm-select-option[aria-selected='true'] {
  background: color-mix(in srgb, var(--mm-accent) 8%, var(--mm-surface));
}
.mm-select-panel-enter-active,
.mm-select-panel-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.mm-select-panel-enter-from,
.mm-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .mm-select-panel-enter-active,
  .mm-select-panel-leave-active {
    transition: none;
  }
}
</style>
