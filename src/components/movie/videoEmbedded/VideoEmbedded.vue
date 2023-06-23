<template>
  <SeparatorDivSolidLine v-if="moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer" />
  <div
    class="row movie-trailers justify-center"
    v-if="moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer"
  >
    <div class="column items-center" v-if="moviePage.selectedMovie.portuguese_url_trailer">
      <h6>Trailer Dublado</h6>
      <IframeVideo :width="props.width" :url="moviePage.selectedMovie.portuguese_url_trailer" />
    </div>
    <SeparatorDivLineSolidVertical v-if="moviePage.selectedMovie.portuguese_url_trailer && moviePage.selectedMovie.english_url_trailer" />
    <div class="column items-center" v-if="moviePage.selectedMovie.english_url_trailer">
      <h6>Trailer Legendado</h6>
      <IframeVideo :width="props.width" :url="moviePage.selectedMovie.english_url_trailer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useMovieStore } from 'src/stores/MovieStore';

import IframeVideo from './iframeVideo/IframeVideo.vue';
import SeparatorDivSolidLine from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import SeparatorDivLineSolidVertical from 'src/components/shared/separator/SeparatorDivLineSolidVertical.vue';

interface Props {
  url: string;
  width?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: '560',
});

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
