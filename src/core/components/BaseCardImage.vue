<template>
  <q-img
    ref="imageRef"
    :width="getWidth()"
    :height="getHeight()"
    class="img-movie"
    :no-native-menu="true"
    :draggable="false"
    :style="{
      transform: `rotateX(${roll * rotateConstant}deg)
      rotateY(${tilt * rotateConstant}deg)
      ${scale}`,
    }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot></slot>
    <template v-slot:loading>
      <q-skeleton :width="getWidth()" :height="getHeight()" animation="fade" dark />
    </template>
    <template v-slot:error>
      <div class="absolute-full flex flex-center bg-grey-mid text-white">
        <div class="row justify-center">
          <q-icon class="col-12 q-mb-md" name="error" size="lg" />
          <p>Erro ao carregar imagem</p>
        </div>
      </div>
    </template>
  </q-img>
</template>
<script lang="ts" setup>
import { useParallax } from '@vueuse/core';
import { useQuasar } from 'quasar';
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    animate?: boolean;
  }>(),
  {
    animate: true,
  }
);

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;

const imageRef = ref();

const rotateConstant = 25;
const { tilt: _tilt, roll: _roll } = useParallax(imageRef);
const tilt = ref(0);
const roll = ref(0);
const scale = ref('scale(1)');

let watching = false;
watch([_tilt, _roll], ([newTilt, newRoll]) => {
  if (!watching) {
    return;
  }

  tilt.value = newTilt;
  roll.value = newRoll;
});
function onEnter() {
  if (!props.animate) {
    return;
  }
  watching = true;
  scale.value = 'scale(1.1)';
}
function onLeave() {
  if (!props.animate) {
    return;
  }
  watching = false;
  tilt.value = 0;
  roll.value = 0;
  scale.value = 'scale(1)';
}
watch(
  () => props.animate,
  (newValue) => {
    if (!newValue) {
      watching = false;
      tilt.value = 0;
      roll.value = 0;
      scale.value = 'scale(1)';
    }
  }
);

function getHeight() {
  if (isMobile) {
    return '120px';
  }

  return '380px';
}
function getWidth() {
  if (isMobile) {
    return '80px';
  }

  return '250px';
}
</script>

<style lang="scss">
.img-movie {
  border-radius: 10px;
  transition: 0.2s ease-out;
  border: var(--grey-mid) solid 2px;
  cursor: pointer;

  .hover-show-img {
    opacity: 0;
  }

  &:hover {
    .hover-show-img {
      opacity: 1;
      transition: opacity 0.3s ease-out;
    }
  }

  &:hover.animate {
    transform: scale(1.1);
  }
}
</style>
