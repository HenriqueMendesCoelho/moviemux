<template>
  <div>
    <h2>{{ t('library.genresTitle') }}</h2>
    <p class="mm-genre-explanation">
      {{ t('library.genresHelp') }}
    </p>
    <ul v-if="genres.length" class="mm-genre-bars" :aria-label="t('library.genresLabel')">
      <li v-for="genre in genres" :key="genre.name">
        <div class="mm-genre-label">
          <span>{{ genre.label }}</span
          ><strong>{{ genre.count.toLocaleString(locale) }}</strong>
        </div>
        <div class="mm-genre-track" aria-hidden="true">
          <span :style="{ width: `${(genre.count / maximum) * 100}%` }" />
        </div>
      </li>
    </ul>
    <p v-else class="mm-empty">{{ t('library.noGenres') }}</p>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, te, locale } = useI18n();
import { computed } from 'vue';
import { standardGenreId } from '../utils/monthLabels';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';
const props = defineProps<{ chartsData?: MovieStatistics }>();
const genres = computed(() =>
  Object.entries(props.chartsData?.movies_by_gender || {})
    .map(([name, count]) => {
      const id = standardGenreId(name);
      const key = `catalog.genre.${id}`;
      return { name, count, label: id && te(key) ? t(key) : name };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale.value)),
);
const maximum = computed(() => Math.max(1, ...genres.value.map((genre) => genre.count)));
</script>
<style scoped>
h2 {
  font-size: 1.1rem;
  margin: 0 0 6px;
}
.mm-genre-explanation {
  font-size: 0.8rem;
  color: var(--mm-muted);
  line-height: 1.5;
  margin: 0 0 20px;
}
.mm-genre-bars {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;
}
.mm-genre-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  margin-bottom: 6px;
}
.mm-genre-track {
  height: 6px;
  border-radius: 3px;
  background: var(--mm-border);
  overflow: hidden;
}
.mm-genre-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #00f6ff;
}
</style>
