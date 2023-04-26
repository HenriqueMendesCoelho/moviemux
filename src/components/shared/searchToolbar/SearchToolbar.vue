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
      option-label="label"
      option-value="value"
      options-dense
      emit-value
      map-options
    />
    <slot></slot>
    <q-separator class="q-mx-md" dark vertical inset />
    <q-btn @click="emit('refresh')" icon="refresh" flat round />
  </q-toolbar>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

interface Props {
  orderOptions: Array<string | object>;
  inputSearch: string;
  selectOrder: string | undefined | { label: string; value: string };
  selectOrderLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectOrderLabel: 'Ordenar',
});

const emit = defineEmits<{
  (e: 'inputSearch', value: string): void;
  (e: 'selectOrder', value: string | undefined | { label: string; value: string }): void;
  (e: 'search', value: void): void;
  (e: 'refresh', value: void): void;
}>();

const searchText = ref('');
const orderOption = ref<string | undefined | { label: string; value: string }>('');

onMounted(() => {
  orderOption.value = props.selectOrder;
}),
  watch(searchText, (val: string) => {
    emit('inputSearch', val);
  });

watch(
  () => props.inputSearch,
  (val: string) => {
    searchText.value = val;
  }
);

watch(orderOption, (val: string | undefined | { label: string; value: string }) => {
  emit('selectOrder', val);
});

watch(
  () => props.selectOrder,
  (val: string | undefined | { label: string; value: string }) => {
    orderOption.value = val;
  }
);
</script>
