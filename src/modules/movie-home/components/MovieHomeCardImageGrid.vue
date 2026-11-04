<template>
  <article class="mm-poster-card">
    <router-link :to="{ name: 'movie', params: { id: movie.id } }" class="mm-poster-link">
      <BaseCardImage :src="movie.url_image" :alt="movie.portuguese_title"
        ><BaseChipNote v-if="showChipNote()" :movie="movie" /><span v-else class="mm-badge">{{
          t('catalog.unrated')
        }}</span></BaseCardImage
      >
    </router-link>
    <div class="mm-card-footer">
      <router-link :to="{ name: 'movie', params: { id: movie.id } }" class="mm-poster-link">
        <h3 :title="movie.portuguese_title">{{ movie.portuguese_title }}</h3>
        <p>{{ DateUtils.toLocaleDateStringLong(movie.release_date, locale) }}</p> </router-link
      ><MovieHomeContextMenu :movie-id="movie.id || ''" :title="movie.portuguese_title" />
    </div>
  </article>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
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
  margin: 0 0 5px;
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
.mm-card-footer {
  display: flex;
  align-items: start;
  gap: 4px;
  margin-top: 10px;
}
.mm-card-footer > a {
  flex: 1;
  min-width: 0;
}
.mm-card-footer :deep(details) {
  flex-shrink: 0;
  margin: 0;
}
.mm-card-footer h3 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mm-card-footer :deep(summary) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  padding-inline: 0;
  width: 44px;
}
</style>
