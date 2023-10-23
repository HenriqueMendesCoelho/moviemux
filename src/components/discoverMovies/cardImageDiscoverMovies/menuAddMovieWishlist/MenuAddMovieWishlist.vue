<template>
  <q-menu anchor="top end" self="top start" class="bg-grey-dark2" dark>
    <q-list>
      <q-item v-for="list in wishlists" :key="list.name" clickable :disable="disableList(list)" @click="emit('addMovie', list.id)">
        <q-item-section v-close-popup class="q-pl-sm">{{ list.name }}</q-item-section>
        <CustomTooltip v-if="disableList(list)" :delay="500">Filme já adicionado nessa lista</CustomTooltip>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import type { WishlistType } from 'src/types/wishlist/WishlistType';
import type { MovieResultResponseTmdb } from 'src/types/movie/MovieType';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
const props = defineProps<{
  movie: ArrayElement<MovieResultResponseTmdb['results']> | number;
  wishlists: WishlistType[];
}>();
const emit = defineEmits<{
  (e: 'addMovie', value: string): void;
}>();

function disableList(list: WishlistType) {
  return list.movies_wishlists?.some((m) => m.tmdb_id === getMovieId());
}
function getMovieId() {
  if (typeof props.movie === 'object') {
    return props.movie.id;
  }

  return props.movie;
}
</script>
