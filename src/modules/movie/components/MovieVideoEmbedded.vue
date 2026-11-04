<template>
  <section v-if="movie.portuguese_url_trailer || movie.english_url_trailer" class="mm-trailers">
    <h2>{{ t('catalog.movie.trailers') }}</h2>
    <div class="mm-trailers-grid">
      <div v-if="movie.portuguese_url_trailer">
        <h3>{{ t('catalog.movie.dubbed') }}</h3>
        <MovieYoutubeTrailerIframe :url="movie.portuguese_url_trailer" :width="width" />
      </div>
      <div v-if="movie.english_url_trailer">
        <h3>{{ t('catalog.movie.subtitled') }}</h3>
        <MovieYoutubeTrailerIframe :url="movie.english_url_trailer" :width="width" />
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { useMovieContext } from '../composables/useMovieContext';
import MovieYoutubeTrailerIframe from './MovieYoutubeTrailerIframe.vue';
defineProps<{ width?: string }>();
const movie = useMovieContext();
</script>
<style scoped>
.mm-trailers {
  margin-top: 3rem;
}
.mm-trailers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 1.5rem;
}
.mm-trailers h3 {
  font-size: 0.9rem;
  margin: 1rem 0;
  opacity: 0.7;
}
</style>
