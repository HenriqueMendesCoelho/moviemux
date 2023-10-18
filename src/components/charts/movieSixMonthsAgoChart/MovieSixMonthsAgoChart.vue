<template>
  <apexchart width="600" type="bar" :options="chartOptions" :series="series" />
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
  xaxis: {
    categories: [] as string[],
  },
  tooltip: {
    enabled: false,
  },
  title: {
    text: 'Quantidade de Filmes Assistidos nos Últimos 6 Meses',
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
const series = ref<
  {
    name: string;
    data: number[];
  }[]
>([]);

const showChart = ref(false);

onMounted(() => {
  if (!props.chartsData) {
    return;
  }

  setCategories();
  setData();
  showChart.value = true;
});

watch(
  () => props.chartsData,
  () => {
    setCategories();
    setData();
    showChart.value = true;
  }
);

function setCategories() {
  if (!props.chartsData?.movies_six_months_ago) {
    return;
  }

  const moviesSixMonthsAgo = Object.keys(props.chartsData?.movies_six_months_ago);

  chartOptions.value.xaxis.categories = moviesSixMonthsAgo;
}
function setData() {
  const moviesSixMonthsAgo = props.chartsData?.movies_six_months_ago;
  if (!moviesSixMonthsAgo) {
    return;
  }

  const values = Object.values(moviesSixMonthsAgo);

  series.value.push({
    name: 'Mês',
    data: values,
  });
}
</script>
