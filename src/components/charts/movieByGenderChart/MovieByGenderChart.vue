<template>
  <apexchart v-if="showChart" width="600" type="donut" :options="chartOptions" :series="series" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import type { MovieStatistics } from 'src/types/statistics/Statistics';

const props = defineProps<{
  chartsData?: MovieStatistics;
}>();

const chartOptions = ref({
  chart: {
    id: 'movies-six-months-ago',
    foreColor: '#fff',
    toolbar: {
      show: false,
    },
  },
  labels: [] as string[],
  tooltip: {
    enabled: true,
  },
  title: {
    text: 'Distribuição de Gêneros dos Filmes',
    align: 'left',
    margin: 10,
    offsetX: 0,
    offsetY: 0,
    floating: false,
    style: {
      fontSize: '20px',
      fontWeight: '300',
      color: '#fff',
    },
  },
});
const series = ref<number[]>([]);

const showChart = ref(false);

onMounted(() => {
  if (!props.chartsData) {
    return;
  }

  setLabels();
  setData();
  showChart.value = true;
});

watch(
  () => props.chartsData,
  () => {
    setLabels();
    setData();
    showChart.value = true;
  }
);

function setLabels() {
  if (!props.chartsData?.movies_by_gender) {
    return;
  }

  const moviesByGender = Object.keys(props.chartsData?.movies_by_gender);

  chartOptions.value.labels = moviesByGender;
}
function setData() {
  const moviesByGender = props.chartsData?.movies_by_gender;
  if (!moviesByGender) {
    return;
  }

  const values = Object.values(moviesByGender);

  series.value.push(...values);
}
</script>
