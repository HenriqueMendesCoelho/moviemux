<template>
  <CardImage
    :class="`${selected && 'img-movie-selected'}`"
    :src="getUrl()"
    @click="emit('clickOnImage', props?.movie?.tmdb_id)"
    :animate="!selected"
  >
    <div class="absolute-bottom hover-show-img text-center" v-if="!selected">
      {{ props.movie?.title }}<br />
      {{ getMovieDateLocale() }}
    </div>
    <q-btn
      class="absolute all-pointer-events cursor-pointer"
      icon="more_horiz"
      color="grey-mid2"
      style="top: 8px; right: 8px"
      size="sm"
      dark
      round
      @click.stop
    >
      <q-menu class="bg-grey-dark2" dark @before-show="selected = true" @before-hide="selected = false">
        <q-list>
          <q-item clickable v-close-popup>
            <q-item-section side>
              <q-icon name="delete" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Remover da lista</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </CardImage>
</template>
<script setup lang="ts">
import { ref } from 'vue';

import { WishlistType } from 'src/types/wishlist/WishlistType';

import CardImage from 'src/components/shared/cardImage/CardImage.vue';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
interface Props {
  movie: ArrayElement<WishlistType['movies_wishlists']>;
}

const emit = defineEmits<{
  (e: 'clickOnImage', value: number): void;
  (e: 'delete', value: number): void;
}>();

const props = defineProps<Props>();
const selected = ref(false);

function getUrl() {
  return `https://image.tmdb.org/t/p/w500${props.movie?.url_image}`;
}
function getMovieDateLocale() {
  if (!props.movie?.release_date) {
    return;
  }
  const date = new Date(props.movie.release_date);
  return date.toLocaleString('pt-Br', {
    dateStyle: 'long',
  });
}
</script>

<style lang="scss" scoped>
.img-movie-selected {
  opacity: 0.7;
  filter: blur(2px);
}
</style>
