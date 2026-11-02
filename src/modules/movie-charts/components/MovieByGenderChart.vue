<template>
  <div>
    <h2>Filmes por gênero</h2>
    <p class="mm-genre-explanation">
      Um filme pode ter mais de um gênero. Os números indicam filmes, não porcentagens.
    </p>
    <ul v-if="genres.length" class="mm-genre-bars" aria-label="Quantidade de filmes por gênero">
      <li v-for="genre in genres" :key="genre.name">
        <div class="mm-genre-label">
          <span>{{ genre.name }}</span
          ><strong>{{ genre.count }}</strong>
        </div>
        <div class="mm-genre-track" aria-hidden="true">
          <span :style="{ width: `${(genre.count / maximum) * 100}%` }" />
        </div>
      </li>
    </ul>
    <p v-else class="mm-empty">Nenhum gênero registrado.</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';
const props = defineProps<{ chartsData?: MovieStatistics }>();
const genres = computed(() =>
  Object.entries(props.chartsData?.movies_by_gender || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
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
