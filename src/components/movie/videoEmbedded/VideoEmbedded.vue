<template>
  <div class="row movie-trailers justify-center" v-if="moviePage.selectedMovie.trailerBr || moviePage.selectedMovie.trailerEn">
    <div class="column items-center" v-if="moviePage.selectedMovie.trailerBr">
      <h6>Trailer Dublado</h6>
      <IframeVideo :width="width" :url="moviePage.selectedMovie.trailerBr" />
    </div>
    <SeparatorDivLineSolidVertical v-if="showSeparationBar && moviePage.selectedMovie.trailerBr && moviePage.selectedMovie.trailerEn" />
    <div class="column items-center" v-if="moviePage.selectedMovie.trailerEn">
      <h6>Trailer Legendado</h6>
      <IframeVideo :width="width" :url="moviePage.selectedMovie.trailerEn" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import IframeVideo from './iframeVideo/IframeVideo.vue';
import SeparatorDivLineSolidVertical from '@/components/shared/separator/SeparatorDivLineSolidVertical.vue';

export default defineComponent({
  name: 'VideoEmbedded',
  components: { IframeVideo, SeparatorDivLineSolidVertical },
  props: {
    width: {
      type: String,
      default: '560',
    },
    showSeparationBar: {
      type: String,
      default: '560',
    },
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage', 'allMovies']),
  },
});
</script>

<style lang="scss" scoped>
.movie-trailers {
  @media (max-width: 768px) {
    max-width: 100%;
    overflow: hidden;
  }
}
</style>
