<template>
  <BaseHorizontalSeparator v-if="moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer" />
  <div
    class="row movie-trailers justify-center"
    v-if="moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer"
  >
    <div class="column items-center" v-if="moviePage.selectedMovie.portuguese_url_trailer">
      <h6>Trailer Dublado</h6>
      <MovieYoutubeTrailerIframe :width="props.width" :url="moviePage.selectedMovie.portuguese_url_trailer" />
    </div>
    <BaseVerticalSeparator
      v-if="moviePage.selectedMovie.portuguese_url_trailer && moviePage.selectedMovie.english_url_trailer && isDesktop"
    />
    <div class="column items-center" v-if="moviePage.selectedMovie.english_url_trailer">
      <h6>Trailer Legendado</h6>
      <MovieYoutubeTrailerIframe :width="props.width" :url="moviePage.selectedMovie.english_url_trailer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';

import { useMovieStore } from '../stores/MovieStore';

import MovieYoutubeTrailerIframe from './MovieYoutubeTrailerIframe.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseVerticalSeparator from 'src/core/components/BaseVerticalSeparator.vue';

const props = withDefaults(
  defineProps<{
    width?: string;
  }>(),
  {
    width: '560',
  }
);
const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;

const movieStore = useMovieStore();

const moviePage = computed(() => movieStore.moviePage);
</script>

<style lang="scss" scoped>
.movie-trailers {
  @media (max-width: 768px) {
    max-width: 100%;
    overflow: hidden;
  }
}
</style>
