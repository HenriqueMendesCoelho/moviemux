<template>
  <q-dialog @beforeShow="loadMovie" @hide="onHide()" v-model="visible" :maximized="maximizedToggle">
    <q-card class="bg-grey-dark2 dialog-container" :style="conditionalCardStyle()">
      <q-bar class="bg-grey-dark2 q-mt-xs">
        <q-space />
        <slot name="prepend:bar" />
        <q-btn round dense flat icon="link" color="white" size="md" @click="copyMovie()">
          <CustomTooltip :delay="400">Copiar URL</CustomTooltip>
        </q-btn>
        <q-btn round dense flat icon="minimize" color="white" size="md" @click="maximizedToggle = false" :disable="!maximizedToggle">
          <CustomTooltip :delay="400" v-if="maximizedToggle">Minimizar</CustomTooltip>
        </q-btn>
        <q-btn round dense flat icon="crop_square" color="white" size="md" @click="maximizedToggle = true" :disable="maximizedToggle">
          <CustomTooltip :delay="400" v-if="!maximizedToggle">Maximizar</CustomTooltip>
        </q-btn>
        <q-btn round dense flat icon="close" color="white" size="md" v-close-popup>
          <CustomTooltip :delay="400">Fechar</CustomTooltip>
        </q-btn>
      </q-bar>

      <q-card-section>
        <FormMovieSummary @error="visible = false" ref="formMovieSummaryRef" :movieId="movieId || 0" />
      </q-card-section>
      <q-card-section class="row"></q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import FormMovieSummary from '../FormMovieSummary.vue';
import CustomTooltip from '../../customTooltip/CustomTooltip.vue';

const $q = useQuasar();
const props = defineProps<{ modelValue: boolean; movieId?: number }>();

const visible = ref(false);
const formMovieSummaryRef = ref<{ getMovie: () => Promise<void> }>();
const maximizedToggle = ref(false);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'hide', value: void): void;
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

function showSuccess(msg: string) {
  $q.notify({
    type: 'positive',
    message: msg,
    position: 'top',
  });
}

async function loadMovie() {
  await formMovieSummaryRef.value?.getMovie();
}
function onHide() {
  maximizedToggle.value = false;
  emit('hide');
}
function conditionalCardStyle() {
  return !maximizedToggle.value ? 'border-radius: 15px; border: var(--grey-mid) solid 5px;' : 'border-radius: 0px; border: none;';
}
function copyMovie() {
  if (!props?.movieId) {
    return;
  }

  const url = `${window.location.origin}/movie/discover?movie=${props?.movieId}`;
  navigator.clipboard.writeText(url);
  showSuccess('URL copiada');
  return url ? url : '';
}
</script>
<style lang="scss" scoped>
.dialog-container {
  background-color: var(--grey-dark2);

  min-width: 80vw;

  @media only screen and (max-width: $breakpoint-md-min) {
    min-width: 100svw;
  }
}
</style>
