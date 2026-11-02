<template>
  <BaseContainerMain
    ><header class="mm-dashboard-heading">
      <div>
        <h1>Estatísticas</h1>
      </div>
      <button class="mm-button" :disabled="loading" @click="getChartsData">
        {{ loading ? 'Atualizando…' : 'Atualizar' }}
      </button>
    </header>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loading && !chartsData" role="status">Carregando estatísticas…</p>
    <div v-if="chartsData" class="mm-stat-grid">
      <article class="mm-stat-card">
        <span>Total de filmes</span><strong>{{ chartsData?.total_number_of_movies ?? '—' }}</strong>
      </article>
      <article class="mm-stat-card">
        <span>Duração média</span
        ><strong>{{
          chartsData.total_number_of_movies
            ? StringUtils.runtimeToText(chartsData.average_runtime) || '—'
            : '—'
        }}</strong>
      </article>
      <article class="mm-stat-card">
        <span>Nota média</span
        ><strong
          >{{ chartsData.total_number_of_movies ? knobAvgNote.toFixed(1) : '—'
          }}<small> / 10</small></strong
        >
        <div
          v-if="chartsData.total_number_of_movies"
          class="mm-average-track"
          role="meter"
          :aria-valuenow="knobAvgNote"
          :aria-valuemin="0"
          :aria-valuemax="10"
          :aria-valuetext="`${knobAvgNote.toFixed(1)} de 10`"
          aria-label="Nota média"
        >
          <span :style="{ width: `${Math.min(10, Math.max(0, knobAvgNote)) * 10}%` }" />
        </div>
      </article>
    </div>
    <p v-if="chartsData?.total_number_of_movies === 0" class="mm-muted">
      Sua coleção ainda está vazia. Adicione filmes para acompanhar suas estatísticas.
    </p>
    <div v-if="chartsData" class="mm-chart-grid">
      <section class="mm-chart-card">
        <ClientOnly
          ><MovieSixMonthsAgoChart :charts-data="chartsData" /><template #fallback
            ><p>Carregando gráfico…</p></template
          ></ClientOnly
        >
      </section>
      <section class="mm-chart-card">
        <ClientOnly
          ><MovieByGenderChart :charts-data="chartsData" /><template #fallback
            ><p>Carregando gráfico…</p></template
          ></ClientOnly
        >
      </section>
    </div></BaseContainerMain
  >
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';

import type { MovieStatistics } from 'src/core/types/statistics/Statistics';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';

import MovieSixMonthsAgoChart from '../components/MovieSixMonthsAgoChart.vue';
import MovieByGenderChart from '../components/MovieByGenderChart.vue';

import StatisticService from '../services/StatisticService';
import StringUtils from 'src/core/utils/StringUtils';

import { showError } from 'src/core/utils/NotificationUtils';

const userStore = useUserStore();
const chartsData = ref<MovieStatistics>();
const knobAvgNote = ref(0);
const loading = ref(false);
const error = ref('');
let disposed = false;
let generation = 0;
onMounted(getChartsData);
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
watch(
  () => userStore.user.id,
  () => {
    generation++;
    chartsData.value = undefined;
    error.value = '';
    knobAvgNote.value = 0;
    loading.value = false;
    if (userStore.user.isLoged) void getChartsData();
  },
);
async function getChartsData() {
  if (loading.value || disposed || !userStore.user.isLoged) return;
  const version = generation;
  const account = userStore.user.id;
  const session = userStore.user;
  const current = () =>
    !disposed &&
    version === generation &&
    account === userStore.user.id &&
    session === userStore.user &&
    userStore.user.isLoged;
  loading.value = true;
  error.value = '';
  try {
    const res = await StatisticService.movies();
    if (current()) {
      chartsData.value = res;
      knobAvgNote.value = res.average_rate || 0;
    }
  } catch {
    if (current()) {
      error.value = 'Não foi possível carregar as estatísticas. Tente atualizar novamente.';
      showError(error.value);
    }
  } finally {
    if (current()) loading.value = false;
  }
}
</script>

<style scoped>
.mm-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
}
.mm-stat-card,
.mm-chart-card {
  padding: 18px;
  border: 1px solid var(--grey-mid2);
  background: var(--grey-dark2);
  border-radius: 18px;
  min-width: 0;
}
.mm-stat-card span {
  font-size: 0.9rem;
  opacity: 0.6;
}
.mm-stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1.6rem;
}
.mm-stat-card small {
  font-size: 1rem;
  opacity: 0.5;
}
.mm-average-track {
  height: 5px;
  background: var(--mm-border);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 10px;
}
.mm-average-track span {
  display: block;
  height: 100%;
  background: #00f6ff;
}
.mm-dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.mm-dashboard-heading h1 {
  font-size: 1.8rem;
  margin: 0;
}
.mm-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 850px) {
  .mm-chart-grid {
    grid-template-columns: 1fr;
  }
  .mm-stat-grid {
    gap: 10px;
  }
  .mm-stat-card {
    padding: 16px;
  }
  .mm-stat-card strong {
    font-size: 1.5rem;
  }
}
@media (max-width: 500px) {
  .mm-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mm-stat-card:last-child {
    grid-column: 1 / -1;
  }
  .mm-stat-card {
    padding: 12px;
  }
  .mm-chart-card {
    padding: 16px 10px;
  }
}
</style>
