<template>
  <div class="row justify-center q-col-gutter-md">
    <BaseHorizontalSeparator />
    <div class="col-md-1 col-xs-3">
      <q-btn class="w-100" color="positive" text-color="white" label="Salvar" :disable="false" @click="emit('save')" />
    </div>
    <div class="col-md-1 col-xs-3">
      <q-btn class="w-100" color="red" text-color="white" label="Cancelar" :disable="props.disableSave" @click="emit('cancel')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';

const emit = defineEmits<{
  (e: 'save', value: void): void;
  (e: 'cancel', value: void): void;
}>();

const props = withDefaults(
  defineProps<{
    disableSave?: boolean;
    disableCancel?: boolean;
  }>(),
  {
    disableSave: false,
    disableCancel: false,
  }
);
</script>

<style scoped>
.w-100 {
  width: 100%;
}
</style>
