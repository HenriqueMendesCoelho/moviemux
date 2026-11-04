<template>
  <div>
    <h2>{{ t('library.monthlyTitle') }}</h2>
    <p class="mm-month-range">{{ rangeLabel }}</p>
    <apex-chart
      v-if="hasMovies"
      height="300"
      width="100%"
      type="bar"
      :options="chartOptions"
      :series="series"
    />
    <p v-else class="mm-empty">{{ t('library.emptyPeriod') }}</p>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { computed, useId } from 'vue';
import { compactMonthLabel } from '../utils/monthLabels';
import type { ApexOptions } from 'apexcharts';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';
import { useStyleStore } from 'src/core/stores/StyleStore';
const props = defineProps<{ chartsData?: MovieStatistics }>();
const style = useStyleStore();
const id = `movie-monthly-${useId()}`;
const foreground = computed(() => (style.layoutSettings.darkMode ? '#e5edf5' : '#203247'));
const months = computed(() => Object.keys(props.chartsData?.movies_six_months_ago || {}));
const rangeLabel = computed(() => {
  const first = months.value[0];
  const last = months.value.at(-1);
  if (!first || !last) return t('library.noPeriod');
  const startYear = first.match(/\d{4}/)?.[0];
  const endYear = last.match(/\d{4}/)?.[0];
  const years =
    startYear && endYear ? (startYear === endYear ? startYear : `${startYear}–${endYear}`) : '';
  return `${compactMonth(first)} – ${compactMonth(last)}${years ? ` · ${years}` : ''} · ${t('library.monthCount', months.value.length)}`;
});
function compactMonth(value: string) {
  return compactMonthLabel(value, locale.value);
}
const hasMovies = computed(() =>
  Object.values(props.chartsData?.movies_six_months_ago || {}).some((count) => count > 0),
);
const chartOptions = computed<ApexOptions>(() => ({
  chart: { id, foreColor: foreground.value, background: 'transparent', toolbar: { show: false } },
  colors: ['#00f6ff'],
  theme: { mode: style.layoutSettings.darkMode ? 'dark' : 'light' },
  grid: { borderColor: style.layoutSettings.darkMode ? '#343c4c' : '#d5e1e8' },
  plotOptions: { bar: { borderRadius: 5, columnWidth: '45%' } },
  xaxis: {
    categories: months.value.map(compactMonth),
    labels: { rotate: 0, hideOverlappingLabels: true },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    decimalsInFloat: 0,
    labels: {
      formatter: (value: number) =>
        Number.isInteger(value) ? value.toLocaleString(locale.value) : '',
    },
  },
  dataLabels: {
    enabled: true,
    style: { colors: ['#202336'] },
    formatter: (value) => (Number(value) > 0 ? Number(value).toLocaleString(locale.value) : ''),
  },
  tooltip: { enabled: true, theme: style.layoutSettings.darkMode ? 'dark' : 'light' },
}));
const series = computed(() => [
  { name: t('library.movies'), data: Object.values(props.chartsData?.movies_six_months_ago || {}) },
]);
</script>

<style scoped>
h2 {
  font-size: 1.1rem;
  margin: 0 0 6px;
}
.mm-month-range {
  font-size: 0.8rem;
  color: var(--mm-muted);
  margin: 0 0 12px;
}
</style>
