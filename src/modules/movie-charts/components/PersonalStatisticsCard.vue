<template>
  <div class="mm-personal-statistics">
    <header>
      <h2>Você e o MovieMux</h2>
      <p class="mm-comparison-caption">Seu histórico e os números do site · todo o período</p>
    </header>
    <p v-if="error" class="mm-comparison-error" role="alert">{{ error }}</p>
    <BaseLoadingState v-if="!statistics && loading" label="Carregando suas estatísticas…">
      <div class="mm-personal-placeholder">
        <BaseSkeleton height="5rem" shape="block" />
        <BaseSkeleton height="5rem" shape="block" />
        <BaseSkeleton height="4rem" shape="block" />
      </div>
    </BaseLoadingState>
    <template v-else-if="statistics">
      <section class="mm-comparison-section" aria-label="Comparação das notas médias">
        <h3>Nota média</h3>
        <div class="mm-comparison-pair">
          <div class="mm-comparison-value mm-comparison-value-personal">
            <span>Você</span>
            <strong
              >{{ formatRating(averages.rating)
              }}<small v-if="averages.rating !== null"> / 10</small></strong
            >
            <span class="mm-comparison-track" aria-hidden="true">
              <span :style="{ width: `${(averages.rating ?? 0) * 10}%` }" />
            </span>
          </div>
          <div class="mm-comparison-value">
            <span>MovieMux</span>
            <strong
              >{{ formatRating(siteRating) }}<small v-if="siteRating !== null"> / 10</small></strong
            >
            <span class="mm-comparison-track" aria-hidden="true">
              <span :style="{ width: `${(siteRating ?? 0) * 10}%` }" />
            </span>
          </div>
        </div>
        <p class="mm-comparison-caption">Suas avaliações × todas as avaliações do site.</p>
        <p v-if="statistics.ratings_given === 0" class="mm-comparison-caption">
          Avalie um filme para começar sua comparação.
        </p>
        <p v-if="siteRating === 0" class="mm-comparison-caption">
          O site informa zero tanto para média zero quanto para ausência de avaliações.
        </p>
      </section>
      <section class="mm-comparison-section" aria-label="Comparação da duração média">
        <h3>Duração média dos filmes</h3>
        <div class="mm-comparison-pair">
          <div class="mm-comparison-value mm-comparison-value-personal">
            <span>Você</span>
            <strong>{{ formatDuration(averages.runtime) }}</strong>
          </div>
          <div class="mm-comparison-value">
            <span>MovieMux</span>
            <strong>{{ formatDuration(siteRuntime) }}</strong>
          </div>
        </div>
        <p class="mm-comparison-caption">Filmes que você avaliou × todos os filmes do catálogo.</p>
      </section>
      <dl class="mm-personal-totals">
        <div>
          <dt>Avaliações suas</dt>
          <dd>{{ formatCount(statistics.ratings_given) }}</dd>
        </div>
        <div>
          <dt>Filmes adicionados por você</dt>
          <dd>{{ formatCount(statistics.registered_movies) }}</dd>
        </div>
        <div>
          <dt>Tempo dos filmes que avaliou</dt>
          <dd>{{ formatDuration(statistics.display_time) }}</dd>
        </div>
      </dl>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import BaseLoadingState from 'src/core/components/BaseLoadingState.vue';
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';
import {
  formatDuration,
  formatRating,
  nonNegativeNumber,
  personalAverages,
  rating,
  type PersonalStatistics,
} from '../utils/statisticsComparison';
const props = defineProps<{
  statistics?: PersonalStatistics;
  chartsData?: MovieStatistics;
  loading: boolean;
  error: string;
}>();
const averages = computed(() => personalAverages(props.statistics));
const siteRating = computed(() =>
  props.chartsData?.total_number_of_movies ? rating(props.chartsData.average_rate) : null,
);
const siteRuntime = computed(() =>
  props.chartsData?.total_number_of_movies
    ? nonNegativeNumber(props.chartsData.average_runtime)
    : null,
);
function formatCount(value: number | null) {
  return value === null ? '—' : value.toLocaleString('pt-BR');
}
</script>
<style scoped>
h2 {
  font-size: 1.1rem;
  margin: 0 0 6px;
}
h3 {
  font-size: 0.9rem;
  margin: 0 0 12px;
}
.mm-comparison-caption {
  color: var(--mm-muted);
  font-size: 0.78rem;
  line-height: 1.5;
  margin: 8px 0 0;
}
.mm-comparison-section {
  padding: 20px 0;
  border-bottom: 1px solid var(--mm-border);
}
.mm-comparison-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.mm-comparison-value {
  min-width: 0;
}
.mm-comparison-value > span:first-child {
  color: var(--mm-muted);
  font-size: 0.8rem;
}
.mm-comparison-value strong {
  display: block;
  margin-top: 3px;
  font-size: 1.4rem;
  overflow-wrap: anywhere;
}
.mm-comparison-value small {
  color: var(--mm-muted);
  font-size: 0.8rem;
  font-weight: 400;
}
.mm-comparison-track {
  display: block;
  margin-top: 9px;
  height: 5px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--mm-border);
}
.mm-comparison-track > span {
  display: block;
  height: 100%;
  background: var(--mm-muted);
}
.mm-comparison-value-personal .mm-comparison-track > span {
  background: #00f6ff;
}
.mm-personal-totals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0 0;
}
.mm-personal-totals > div {
  min-width: 0;
}
.mm-personal-totals dt {
  color: var(--mm-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}
.mm-personal-totals dd {
  margin: 6px 0 0;
  font-size: 1.05rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.mm-personal-placeholder {
  display: grid;
  gap: 18px;
  margin-top: 20px;
}
.mm-comparison-error {
  color: var(--mm-text);
  font-size: 0.85rem;
  line-height: 1.5;
}
@media (max-width: 500px) {
  .mm-comparison-pair {
    gap: 16px;
  }
  .mm-personal-totals {
    gap: 12px;
  }
  .mm-comparison-value strong {
    font-size: 1.2rem;
  }
}
</style>
