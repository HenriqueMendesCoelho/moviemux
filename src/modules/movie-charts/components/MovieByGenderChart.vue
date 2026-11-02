<template>
  <apex-chart
    v-if="chartsData"
    height="380"
    width="100%"
    type="donut"
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
const id = `movie-genres-${useId()}`;
const foreground = computed(() => (style.layoutSettings.darkMode ? '#e5edf5' : '#203247'));
const chartOptions = computed<ApexOptions>(() => ({
  chart: { id, foreColor: foreground.value, background: 'transparent', toolbar: { show: false } },
  colors: ['#00f6ff', '#02848b', '#58b4bc', '#73d1d6', '#a3e6e9', '#315f70'],
  labels: Object.keys(props.chartsData?.movies_by_gender || {}),
  theme: { mode: style.layoutSettings.darkMode ? 'dark' : 'light' },
  stroke: { colors: [style.layoutSettings.darkMode ? '#1f2531' : '#ffffff'], width: 3 },
  tooltip: { enabled: true, theme: style.layoutSettings.darkMode ? 'dark' : 'light' },
  legend: { position: 'bottom' },
  title: {
    text: 'Distribuição de gêneros',
    align: 'center',
    style: { fontSize: '16px', fontWeight: 500, color: foreground.value },
  },
}));
const series = computed(() => Object.values(props.chartsData?.movies_by_gender || {}));
</script>
