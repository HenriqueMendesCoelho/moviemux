<template>
  <article class="mm-poster-card">
    <router-link :to="{ name: 'movie', params: { id: movie.id } }" class="mm-poster-link">
      <BaseCardImage :src="movie.url_image"
        ><BaseChipNote v-if="showChipNote()" :movie="movie" /><span v-else class="mm-badge"
          >Sem avaliações</span
        ></BaseCardImage
      >
      <h3>{{ movie.portuguese_title }}</h3>
      <p>{{ DateUtils.toLocaleDateStringLong(movie.release_date) }}</p> </router-link
    ><MovieHomeContextMenu :movie-id="movie.id || ''" />
  </article>
</template>

<script lang="ts" setup>
import type Movie from 'src/core/domain/movie/movie';

import MovieHomeContextMenu from './MovieHomeContextMenu.vue';

import BaseChipNote from 'src/core/components/BaseChipNote.vue';
import BaseCardImage from 'src/core/components/BaseCardImage.vue';

import DateUtils from 'src/core/utils/DateUtils';

interface Props {
  movie: Movie;
}

const props = defineProps<Props>();

function showChipNote() {
  return props.movie?.notes?.length && props.movie?.show_notes;
}
</script>

<style scoped>
.mm-poster-card {
  min-width: 0;
  position: relative;
}
.mm-poster-link {
  display: block;
  text-decoration: none;
  color: inherit;
}
.mm-poster-link h3 {
  font-size: 1rem;
  margin: 12px 0 5px;
  line-height: 1.4;
}
.mm-poster-link p {
  font-size: 0.8rem;
  opacity: 0.6;
}
.mm-poster-link :deep(.mm-rating),
.mm-badge {
  position: absolute;
  left: 10px;
  top: 10px;
}
.mm-badge {
  background: #111c;
  color: #fff;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
}
</style>
