<template>
  <SeparatorDivSolidLine v-if="moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer" />
  <div
    class="row movie-trailers justify-center"
    v-if="moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer"
  >
    <div class="column items-center" v-if="moviePage.selectedMovie.portuguese_url_trailer">
      <h6>Trailer Dublado</h6>
      <IframeVideo :width="width" :url="moviePage.selectedMovie.portuguese_url_trailer" />
    </div>
    <SeparatorDivLineSolidVertical
      v-if="showSeparationBar && moviePage.selectedMovie.portuguese_url_trailer && moviePage.selectedMovie.english_url_trailer"
    />
    <div class="column items-center" v-if="moviePage.selectedMovie.english_url_trailer">
      <h6>Trailer Legendado</h6>
      <IframeVideo :width="width" :url="moviePage.selectedMovie.english_url_trailer" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import IframeVideo from './iframeVideo/IframeVideo.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import SeparatorDivLineSolidVertical from '@/components/shared/separator/SeparatorDivLineSolidVertical.vue';

export default defineComponent({
  name: 'VideoEmbedded',
  components: { IframeVideo, SeparatorDivSolidLine, SeparatorDivLineSolidVertical },
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
    ...mapState(useMovieStore, ['moviePage']),
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
