<template>
  <div class="mm-search-toolbar">
    <slot name="prepend" />
    <div class="mm-search-field">
      <label class="mm-sr-only" :for="searchId">{{ t('components.searchMovies') }}</label
      ><input
        :id="searchId"
        ref="input"
        type="search"
        maxlength="150"
        :placeholder="t('components.searchMoviesPlaceholder')"
        :value="inputSearch"
        @input="changed"
        @focus="emit('inputSearchFocus', true)"
        @blur="emit('inputSearchFocus', false)"
        @keydown.enter.prevent="search"
        @keydown.up.prevent="emit('keydown-up:inputSearch')"
        @keydown.down.prevent="emit('keydown-down:inputSearch')"
        @keydown.esc.prevent="emit('keydown-esc:inputSearch')"
      /><slot name="input-search" />
    </div>
    <button type="button" class="mm-button mm-button-primary" @click="emit('search')">
      {{ t('components.search') }}</button
    ><label v-if="showSelect" class="mm-field"
      ><span class="mm-sr-only">{{ selectOrderLabel || t('components.sort') }}</span
      ><select :value="currentOrder" @change="orderChanged">
        <option value="">{{ selectOrderLabel || t('components.sort') }}</option>
        <option v-for="(option, index) in orderOptions" :key="index" :value="value(option)">
          {{ label(option) }}
        </option>
      </select></label
    ><slot name="append" /><button
      type="button"
      class="mm-button mm-button-ghost"
      :aria-label="t('components.refreshResults')"
      @click="emit('refresh')"
    >
      ↻
    </button>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, ref, useId, nextTick } from 'vue';
const props = withDefaults(
  defineProps<{
    orderOptions?: Array<string | object>;
    inputSearch: string;
    selectOrder?: string | { label: string; value: string };
    selectOrderLabel?: string;
    showSelect?: boolean;
    separetedInputEvent?: boolean;
  }>(),
  { selectOrderLabel: '', showSelect: true, separetedInputEvent: false },
);
const emit = defineEmits<{
  'update:inputSearch': [value: string];
  inputSearchFocus: [value: boolean];
  'update:selectOrder': [value: string | undefined | { label: string; value: string }];
  search: [];
  refresh: [];
  'keydown-enter:inputSearch': [];
  'keydown-up:inputSearch': [];
  'keydown-down:inputSearch': [];
  'keydown-esc:inputSearch': [];
}>();
const input = ref<HTMLInputElement>();
const searchId = useId();
const currentOrder = computed(() =>
  typeof props.selectOrder === 'object' ? props.selectOrder.value : props.selectOrder || '',
);
function value(option: string | object) {
  return typeof option === 'string' ? option : String((option as { value?: unknown }).value ?? '');
}
function label(option: string | object) {
  return typeof option === 'string' ? option : String((option as { label?: unknown }).label ?? '');
}
async function changed(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const cleared = Boolean(props.inputSearch) && !value;
  emit('update:inputSearch', value);
  emit('inputSearchFocus', true);
  if (cleared) {
    await nextTick();
    search();
  }
}
function orderChanged(event: Event) {
  emit('update:selectOrder', (event.target as HTMLSelectElement).value || undefined);
  emit('search');
}
function search() {
  if (props.separetedInputEvent) emit('keydown-enter:inputSearch');
  else emit('search');
  input.value?.blur();
}
</script>
<style scoped>
.mm-search-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--grey-mid);
  border-radius: 18px;
  background: var(--grey-dark2);
  flex-wrap: wrap;
}
.mm-search-field {
  flex: 1;
  min-width: 180px;
  position: relative;
}
.mm-search-field input {
  width: 100%;
}
.mm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
