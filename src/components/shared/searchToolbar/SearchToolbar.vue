<template>
  <q-toolbar class="bg-grey-mid text-white row toolbar">
    <q-icon name="menu" size="sm" v-if="isSlotPrependEmpty()" />
    <slot name="prepend"></slot>
    <q-separator class="q-mx-md" dark vertical inset />
    <q-input
      ref="inputSearchRef"
      class="col q-mr-sm"
      label="Digite"
      v-model="searchText"
      dark
      color="kb-primary"
      maxlength="150"
      @keydown.enter="onSearchAndRemoveFocus"
      @keydown.up.prevent="emit('keydown-up:inputSearch')"
      @keydown.down.prevent="emit('keydown-down:inputSearch')"
      @keydown.esc.prevent="emit('keydown-esc:inputSearch')"
      @update:model-value="emit('inputSearchFocus', true)"
      @blur="emit('inputSearchFocus', false)"
      @clear="onSearchAndRemoveFocus"
      clearable
      borderless
    >
      <slot name="input-search"></slot>
    </q-input>
    <q-btn icon="search" flat round @click="emit('search')" />
    <q-separator class="q-mx-md" dark vertical inset v-if="showSelect || !isSlotAppendEmpty()" />
    <q-select
      v-if="showSelect"
      :class="isSlotAppendEmpty() ? 'col-3' : 'col-2'"
      borderless
      :options="orderOptions"
      v-model="orderOption"
      :label="props.selectOrderLabel"
      standout="text-kb-primary"
      color="kb-primary"
      dark
      popup-content-class="bg-grey-dark2"
      clearable
      option-label="label"
      option-value="value"
      options-dense
      emit-value
      map-options
    />
    <slot name="append"></slot>
    <q-separator class="q-mx-md" dark vertical inset />
    <q-btn @click="emit('refresh')" icon="refresh" flat round />
  </q-toolbar>
</template>
<script setup lang="ts">
import { onMounted, ref, useSlots, watch, nextTick } from 'vue';
import { QInput } from 'quasar';

interface Props {
  orderOptions?: Array<string | object>;
  inputSearch: string;
  selectOrder?: string | undefined | { label: string; value: string };
  selectOrderLabel?: string;
  showSelect?: boolean;
  separetedInputEvent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectOrderLabel: 'Ordenar',
  showSelect: true,
  separetedInputEvent: false,
});

const emit = defineEmits<{
  (e: 'update:inputSearch', value: string): void;
  (e: 'inputSearchFocus', value: boolean): void;
  (e: 'update:selectOrder', value: string | undefined | { label: string; value: string }): void;
  (e: 'search', value: void): void;
  (e: 'refresh', value: void): void;
  (e: 'keydown-enter:inputSearch', value: void): void;
  (e: 'keydown-up:inputSearch', value: void): void;
  (e: 'keydown-down:inputSearch', value: void): void;
  (e: 'keydown-esc:inputSearch', value: void): void;
}>();
const slots = useSlots();

const inputSearchRef = ref<InstanceType<typeof QInput>>();
const searchText = ref('');
const orderOption = ref<string | undefined | { label: string; value: string }>('');

onMounted(() => {
  orderOption.value = props.selectOrder;
});

watch(searchText, (val: string) => {
  emit('update:inputSearch', val);
});
watch(
  () => props.inputSearch,
  (val: string) => {
    searchText.value = val;
  }
);

watch(
  () => orderOption.value,
  (val: string | undefined | { label: string; value: string }) => {
    emit('update:selectOrder', val);
    emit('search');
  }
);
watch(
  () => props.selectOrder,
  (val: string | undefined | { label: string; value: string }) => {
    orderOption.value = val;
  }
);

function isSlotPrependEmpty() {
  return !slots.prepend || slots.prepend().length === 0;
}
function isSlotAppendEmpty() {
  return !slots.append || slots.append().length === 0;
}
async function onSearchAndRemoveFocus() {
  await nextTick();
  if (props.separetedInputEvent) {
    emit('keydown-enter:inputSearch');
  } else {
    emit('search');
  }
  inputSearchRef.value?.blur();
}
</script>

<style lang="scss" scoped>
.toolbar {
  border-radius: 15px;
  min-width: 700px;
}
</style>
