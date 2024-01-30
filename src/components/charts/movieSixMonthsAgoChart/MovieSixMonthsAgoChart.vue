<template>
  <apexchart v-if="showChart" :height="height" :width="width" type="bar" :options="chartOptions" :series="series" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import type { MovieStatistics } from 'src/types/statistics/Statistics';

const props = defineProps<{
  chartsData?: MovieStatistics;
}>();

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;
const chartTitle = ref(isDesktop ? 'Quantidade de Filmes Assistidos nos Últimos 6 Meses' : 'Qtd de Filmes nos Últimos 6 Meses');
const chartFontSize = ref(isDesktop ? '20px' : '15px');
const height = isDesktop ? 'auto' : '300px';
const width = isDesktop ? '600px' : '100%';

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
    text: chartTitle.value,
    align: 'center',
    margin: 10,
    offsetX: 0,
    offsetY: 0,
    floating: false,
    style: {
      fontSize: chartFontSize.value,
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
