<template>
  <details class="mm-movie-info">
    <summary>{{ t('catalog.movie.aboutEntry') }}</summary>
    <p>
      {{ t('catalog.movie.registeredBy') }} {{ movie.user_name || t('catalog.movie.unknownUser') }}
    </p>
    <p>
      {{ t('catalog.movie.createdAt') }}
      {{ movie.created_at ? DateUtils.toLocaleString(movie.created_at, locale) : '—' }}
    </p>
    <p>
      {{ t('catalog.movie.updatedAt') }}
      {{ movie.updated_at ? DateUtils.toLocaleString(movie.updated_at, locale) : '—' }}
    </p>
  </details>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { useMovieContext } from '../composables/useMovieContext';
import DateUtils from 'src/core/utils/DateUtils';
const movie = useMovieContext();
</script>
<style scoped>
.mm-movie-info {
  font-size: 0.8rem;
  line-height: 1.7;
  margin: 1rem 0;
  opacity: 0.75;
}
.mm-movie-info summary {
  cursor: pointer;
}
</style>
