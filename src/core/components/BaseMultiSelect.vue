<template>
  <div
    ref="root"
    class="mm-multiselect"
    @keydown.esc.stop.prevent="close(true)"
    @focusout="onFocusOut"
  >
    <span :id="`${id}-label`" class="mm-multiselect-label">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      class="mm-multiselect-trigger"
      :disabled="disabled"
      :aria-labelledby="`${id}-label ${id}-value`"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="`${id}-panel`"
      @click="toggle"
      @keydown.down.prevent="show"
    >
      <span :id="`${id}-value`" class="mm-multiselect-value">{{ summary }}</span>
      <span v-if="model.length > 1" class="mm-multiselect-count">{{
        model.length.toLocaleString(locale)
      }}</span>
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
      <section
        v-if="open"
        :id="`${id}-panel`"
        class="mm-multiselect-panel"
        :class="{ 'mm-multiselect-right': alignRight, 'mm-multiselect-above': openAbove }"
        :style="{ maxHeight: `${panelHeight}px` }"
        role="dialog"
        :aria-labelledby="`${id}-label`"
      >
        <div class="mm-multiselect-search">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            autocomplete="off"
            :aria-label="t('components.searchIn', { label })"
            :placeholder="t('components.searchGenre')"
            @keydown.down.prevent="focusOption(0)"
            @keydown.up.prevent="focusOption(filtered.length - 1)"
          />
        </div>
        <div v-if="loading" class="mm-multiselect-message" role="status">
          {{ t('components.loadingOptions') }}
        </div>
        <div v-else-if="error" class="mm-multiselect-message" role="alert">
          <span>{{ error }}</span
          ><button type="button" class="mm-multiselect-retry" @click="emit('retry')">
            {{ t('components.retry') }}
          </button>
        </div>
        <div
          v-else
          :id="`${id}-list`"
          class="mm-multiselect-options"
          role="listbox"
          aria-multiselectable="true"
          :aria-label="label"
        >
          <button
            v-for="(option, index) in filtered"
            :key="option.value"
            type="button"
            role="option"
            class="mm-multiselect-option"
            :aria-selected="model.includes(option.value)"
            :tabindex="index === activeIndex ? 0 : -1"
            :data-option-index="index"
            @focus="activeIndex = index"
            @click="select(option.value)"
            @keydown.down.prevent="focusOption((index + 1) % filtered.length)"
            @keydown.up.prevent="focusOption((index - 1 + filtered.length) % filtered.length)"
            @keydown.home.prevent="focusOption(0)"
            @keydown.end.prevent="focusOption(filtered.length - 1)"
          >
            <span class="mm-multiselect-check" aria-hidden="true"
              ><svg
                v-if="model.includes(option.value)"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="m5 12 4 4L19 6" /></svg
            ></span>
            <span>{{ option.label }}</span>
          </button>
          <p v-if="!filtered.length" class="mm-multiselect-message" role="status">
            {{ query ? t('components.noGenreFound') : t('components.noGenreAvailable') }}
          </p>
        </div>
        <footer class="mm-multiselect-footer">
          <span aria-live="polite">{{
            model.length
              ? t('components.selectedCount', { count: model.length }, model.length)
              : t('components.allGenres')
          }}</span>
          <button type="button" :disabled="!model.length" @click="clear">
            {{ t('components.clear') }}
          </button>
          <button type="button" @click="close(true)">{{ t('components.done') }}</button>
        </footer>
      </section>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue';
const props = withDefaults(
  defineProps<{
    options: { value: number; label: string }[];
    label: string;
    placeholder?: string;
    loading?: boolean;
    error?: string;
    disabled?: boolean;
  }>(),
  { placeholder: '', loading: false, error: '', disabled: false },
);
const model = defineModel<number[]>({ default: () => [] });
const emit = defineEmits<{ change: [values: number[]]; retry: [] }>();
const id = `mm-select-${useId()}`;
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const searchInput = ref<HTMLInputElement>();
const open = ref(false);
const alignRight = ref(false);
const openAbove = ref(false);
const panelHeight = ref(380);
let listening = false;
const query = ref('');
const activeIndex = ref(0);
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(locale.value);
const filtered = computed(() =>
  props.options.filter((option) => normalize(option.label).includes(normalize(query.value.trim()))),
);
const summary = computed(() => {
  if (!model.value.length) return props.placeholder || t('components.allGenres');
  const first = props.options.find((option) => option.value === model.value[0]);
  return model.value.length === 1
    ? first?.label || t('components.oneSelected')
    : t('components.selectedGenres');
});
watch(query, () => {
  activeIndex.value = 0;
});
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close(false);
  },
);
async function show() {
  if (props.disabled) return;
  positionPanel();
  open.value = true;
  query.value = '';
  activeIndex.value = 0;
  await nextTick();
  if (open.value) searchInput.value?.focus();
}
function toggle() {
  if (open.value) close(false);
  else void show();
}
function close(restore: boolean) {
  open.value = false;
  if (restore) trigger.value?.focus();
}
function select(value: number) {
  model.value = model.value.includes(value)
    ? model.value.filter((item) => item !== value)
    : [...model.value, value];
  emit('change', model.value);
}
function clear() {
  model.value = [];
  emit('change', []);
}
function focusOption(index: number) {
  if (index < 0 || !filtered.value.length) return;
  activeIndex.value = index;
  root.value?.querySelector<HTMLElement>(`[data-option-index="${index}"]`)?.focus();
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close(false);
}
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget && !root.value?.contains(event.relatedTarget as Node)) close(false);
}
function positionPanel() {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) return;
  const viewport = window.visualViewport;
  const top = viewport?.offsetTop || 0;
  const bottom = top + (viewport?.height || window.innerHeight);
  const below = Math.max(0, bottom - rect.bottom - 16);
  const above = Math.max(0, rect.top - top - 16);
  alignRight.value = rect.left + 300 > window.innerWidth - 16;
  openAbove.value = below < 240 && above > below;
  panelHeight.value = Math.min(380, openAbove.value ? above : below);
}
function reposition() {
  if (open.value) positionPanel();
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
onMounted(attach);
onActivated(attach);
onDeactivated(() => {
  close(false);
  detach();
});
onBeforeUnmount(detach);
</script>
<style scoped>
.mm-multiselect {
  position: relative;
  min-width: 0;
  width: 100%;
}
.mm-multiselect-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mm-muted);
}
.mm-multiselect-trigger {
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
.mm-multiselect-trigger:hover,
.mm-multiselect-trigger[aria-expanded='true'] {
  border-color: var(--mm-link);
}
.mm-multiselect-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-multiselect-count {
  display: grid;
  place-items: center;
  min-width: 1.4rem;
  height: 1.4rem;
  border-radius: 6px;
  background: var(--mm-accent);
  color: #06252a;
  font-size: 0.7rem;
  font-weight: 700;
}
.mm-multiselect-panel {
  position: absolute;
  z-index: 45;
  top: calc(100% + 8px);
  left: 0;
  width: max(100%, 280px);
  max-width: calc(100vw - 48px);
  padding: 0.5rem;
  border: 1px solid var(--mm-border);
  border-radius: 14px;
  background: var(--mm-surface);
  box-shadow: 0 14px 40px #0003;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.mm-multiselect-panel.mm-multiselect-above {
  top: auto;
  bottom: calc(100% + 8px);
}
.mm-multiselect-panel.mm-multiselect-right {
  left: auto;
  right: 0;
}
.mm-multiselect-search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.55rem;
  border-bottom: 1px solid var(--mm-border);
  color: var(--mm-muted);
}
.mm-multiselect-search input {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 0;
  padding: 0.5rem 0;
  color: var(--mm-text);
  background: transparent;
  font: inherit;
  font-size: 0.85rem;
}
.mm-multiselect-options {
  min-height: 44px;
  flex: 1 1 auto;
  max-height: min(260px, 38dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.35rem 0;
}
.mm-multiselect-option {
  display: flex;
  align-items: center;
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
.mm-multiselect-option:hover,
.mm-multiselect-option:focus-visible {
  background: var(--mm-raised);
}
.mm-multiselect-option[aria-selected='true'] {
  background: color-mix(in srgb, var(--mm-accent) 8%, var(--mm-surface));
}
.mm-multiselect-check {
  display: grid;
  place-items: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  border: 1px solid var(--mm-muted);
  border-radius: 5px;
}
[aria-selected='true'] .mm-multiselect-check {
  background: var(--mm-accent);
  border-color: var(--mm-accent);
  color: #06252a;
}
.mm-multiselect-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border-top: 1px solid var(--mm-border);
  padding-top: 0.3rem;
  font-size: 0.7rem;
  color: var(--mm-muted);
}
.mm-multiselect-footer > span {
  flex: 1;
}
.mm-multiselect-footer button,
.mm-multiselect-retry {
  min-height: 44px;
  padding: 0.5rem;
  color: var(--mm-link);
  font: inherit;
}
.mm-multiselect-footer button:disabled {
  opacity: 0.5;
}
.mm-multiselect-message {
  margin: 0;
  padding: 0.8rem 0.5rem;
  color: var(--mm-muted);
  font-size: 0.8rem;
}
.mm-select-panel-enter-active,
.mm-select-panel-leave-active {
  transition:
    opacity 0.14s,
    transform 0.14s;
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
@media (max-width: 600px) {
  .mm-multiselect-panel {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
}
</style>
