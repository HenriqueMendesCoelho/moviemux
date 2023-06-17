<template>
  <q-img :class="`${props.animate && 'animate'}`" class="img-movie" width="250px" height="380px" :no-native-menu="true" :draggable="false">
    <slot></slot>
    <template v-slot:loading>
      <q-skeleton width="250px" height="380px" animation="fade" dark bordered />
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
interface Props {
  animate: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  animate: true,
});
</script>
<style lang="scss" scoped>
.img-movie {
  border-radius: 10px;
  transition: 0.2s ease-out;

  cursor: pointer;

  .hover-show-img {
    opacity: 0;
  }

  &:hover.animate {
    transform: scale(1.1);
    .hover-show-img {
      opacity: 1;
      transition: opacity 0.3s ease-out;
    }
  }
}
</style>
