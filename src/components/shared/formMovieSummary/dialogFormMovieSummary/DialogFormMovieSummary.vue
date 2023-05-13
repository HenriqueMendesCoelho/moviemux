<template>
  <q-dialog @beforeShow="loadMovie" @hide="scrollBackToPosition()" v-model="visible">
    <q-card class="bg-grey-dark2 dialog-container" style="min-width: 80vw; border-radius: 15px">
      <q-card-section class="row justify-end">
        <div class="col-auto row">
          <q-btn color="white" icon="close" size="md" @click="visible = false" flat round />
        </div>
        <SeparatorDivLineSolid />
      </q-card-section>
      <q-card-section>
        <FormMovieSummary @error="visible = false" ref="formMovieSummaryRef" :movieId="movieId || 0" />
      </q-card-section>
      <q-card-section class="row"></q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';

import FormMovieSummary from '../FormMovieSummary.vue';
import SeparatorDivLineSolid from '../../separator/SeparatorDivLineSolid.vue';

const props = defineProps<{ modelValue: boolean; movieId?: number }>();
const visible = ref(false);
const formMovieSummaryRef = ref<{ getMovie: () => Promise<void> }>();
const currentPosition = ref(0);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'hide', value: number): void;
}>();

watch(
  () => props.modelValue,
  (val: boolean) => {
    visible.value = val;
  }
);
watch(
  () => visible.value,
  (val: boolean) => {
    emit('update:modelValue', val);
  }
);

async function loadMovie() {
  currentPosition.value = document.documentElement.scrollTop || document.body.scrollTop;
  window.scrollTo(0, 0);
  await formMovieSummaryRef.value?.getMovie();
}
function scrollBackToPosition() {
  window.scrollTo(0, currentPosition.value);
}
</script>
<style lang="scss" scoped>
.dialog-container {
  background-color: var(--grey-dark2);

  overflow-y: hidden;

  border: var(--grey-mid) solid 5px;
  border-radius: 15px !important;
}
</style>
