<template>
  <q-img
    :class="`${props.animate && 'animate'}`"
    class="img-movie"
    :width="getWidth()"
    :height="getHeight()"
    :no-native-menu="true"
    :draggable="false"
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
import { useQuasar } from 'quasar';

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
