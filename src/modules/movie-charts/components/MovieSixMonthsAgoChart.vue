<template>
  <apex-chart
    v-if="chartsData"
    height="380"
    width="100%"
    type="bar"
    :options="chartOptions"
    :series="series"
  />
  <p v-else class="mm-empty">As estatísticas aparecerão aqui.</p>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';
import type { ApexOptions } from 'apexcharts';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';
import { useStyleStore } from 'src/core/stores/StyleStore';
const props = defineProps<{ chartsData?: MovieStatistics }>();
const style = useStyleStore();
const id = `movie-monthly-${useId()}`;
const foreground = computed(() => (style.layoutSettings.darkMode ? '#e5edf5' : '#203247'));
const chartOptions = computed<ApexOptions>(() => ({
  chart: { id, foreColor: foreground.value, background: 'transparent', toolbar: { show: false } },
  colors: ['#00f6ff'],
  theme: { mode: style.layoutSettings.darkMode ? 'dark' : 'light' },
  grid: { borderColor: style.layoutSettings.darkMode ? '#343c4c' : '#d5e1e8' },
  plotOptions: { bar: { borderRadius: 5, columnWidth: '45%' } },
  xaxis: { categories: Object.keys(props.chartsData?.movies_six_months_ago || {}) },
  tooltip: { enabled: true, theme: style.layoutSettings.darkMode ? 'dark' : 'light' },
  title: {
    text: 'Filmes nos últimos 6 meses',
    align: 'center',
    style: { fontSize: '16px', fontWeight: 500, color: foreground.value },
  },
}));
const series = computed(() => [
  { name: 'Filmes', data: Object.values(props.chartsData?.movies_six_months_ago || {}) },
]);
</script>
