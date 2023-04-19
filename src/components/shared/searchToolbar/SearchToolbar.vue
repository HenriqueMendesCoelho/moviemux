<template>
  <q-toolbar class="bg-grey-mid text-white row" style="border-radius: 15px">
    <q-icon name="menu" size="sm" />
    <q-separator class="q-mx-md" dark vertical inset />
    <q-input
      borderless
      class="col q-mr-sm"
      label="Digite"
      v-model="searchText"
      dark
      color="kb-primary"
      maxlength="150"
      @keyup.enter="emit('search')"
    />
    <q-btn icon="search" flat round @click="emit('search')" />
    <q-separator class="q-mx-md" dark vertical inset />
    <q-select
      class="col-3"
      borderless
      :options="orderOptions"
      v-model="orderOption"
      :label="props.selectOrderLabel"
      standout="text-kb-primary"
      color="kb-primary"
      dark
      popup-content-class="bg-grey-dark2"
      clearable
      option-label="name"
      option-value="param"
      options-dense
      emit-value
      map-options
    />
    <q-separator class="q-mx-md" dark vertical inset />
    <q-btn @click="emit('refresh')" icon="refresh" flat round />
  </q-toolbar>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  orderOptions: Array<string | object>;
  inputSearch: string;
  selectOrder: string;
  selectOrderLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectOrderLabel: 'Ordenar',
});

const emit = defineEmits<{
  (e: 'inputSearch', value: string): void;
  (e: 'selectOrder', value: string): void;
  (e: 'search', value: void): void;
  (e: 'refresh', value: void): void;
}>();

const searchText = ref('');
const orderOption = ref('');

watch(searchText, (val: string) => {
  emit('inputSearch', val);
});

watch(
  () => props.inputSearch,
  (val: string) => {
    searchText.value = val;
  }
);

watch(orderOption, (val: string) => {
  emit('selectOrder', val);
});

watch(
  () => props.selectOrder,
  (val: string) => {
    orderOption.value = val;
  }
);
</script>
