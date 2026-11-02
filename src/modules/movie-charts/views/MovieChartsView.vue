<template>
  <BaseContainerMain
    ><header class="mm-section-header">
      <div>
        <span class="mm-eyebrow">Sua coleção em perspectiva</span>
        <h1>Dashboard</h1>
      </div>
      <button class="mm-button" :disabled="loading" @click="getChartsData">
        {{ loading ? 'Atualizando…' : 'Atualizar' }}
      </button>
    </header>
    <div class="mm-stat-grid">
      <article class="mm-stat-card">
        <span>Total de filmes</span><strong>{{ chartsData?.total_number_of_movies ?? '—' }}</strong>
      </article>
      <article class="mm-stat-card">
        <span>Duração média</span
        ><strong>{{ StringUtils.runtimeToText(chartsData?.average_runtime) || '—' }}</strong>
      </article>
      <article class="mm-stat-card">
        <span>Nota média</span><strong>{{ knobAvgNote.toFixed(1) }}<small> / 10</small></strong
        ><meter :value="knobAvgNote" min="0" max="10" aria-label="Nota média" />
      </article>
    </div>
    <div class="mm-chart-grid">
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
  try {
    const res = await StatisticService.movies();
    if (current()) {
      chartsData.value = res;
      knobAvgNote.value = res.average_rate || 0;
    }
  } catch {
    if (current()) showError('Erro ao buscar dados. Tente novamente mais tarde.');
  } finally {
    if (current()) loading.value = false;
  }
}
</script>

<style scoped>
.mm-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin: 28px 0;
}
.mm-stat-card,
.mm-chart-card {
  padding: 24px;
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
  margin-top: 18px;
  font-size: 2rem;
}
.mm-stat-card small {
  font-size: 1rem;
  opacity: 0.5;
}
.mm-stat-card meter {
  width: 100%;
  margin-top: 12px;
  accent-color: var(--primary);
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
    grid-template-columns: 1fr;
  }
}
</style>
