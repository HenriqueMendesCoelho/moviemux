import { afterEach, beforeEach, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { mount, shallowMount, type VueWrapper } from '@vue/test-utils';
import MovieByGenderChart from '../../src/modules/movie-charts/components/MovieByGenderChart.vue';
import MovieSixMonthsAgoChart from '../../src/modules/movie-charts/components/MovieSixMonthsAgoChart.vue';
import { useStyleStore } from '../../src/core/stores/StyleStore';
import type { MovieStatistics } from '../../src/core/types/statistics/Statistics';
const wrappers: VueWrapper[] = [];
const ApexChart = defineComponent({
  name: 'ApexChart',
  props: ['options', 'series'],
  template: '<div />',
});
const data = (): MovieStatistics => ({
  total_number_of_movies: 4,
  average_rate: 7.5,
  average_runtime: 120,
  movies_by_gender: { Drama: 3, Comedy: 1 },
  movies_six_months_ago: { May: 1, June: 3 },
});
beforeEach(() => setActivePinia(createPinia()));
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
function mountGenre() {
  const wrapper = shallowMount(MovieByGenderChart, {
    props: { chartsData: data() },
    global: { components: { ApexChart } },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function mountMonthly() {
  const wrapper = shallowMount(MovieSixMonthsAgoChart, {
    props: { chartsData: data() },
    global: { components: { ApexChart } },
  });
  wrappers.push(wrapper);
  return wrapper;
}
test('refresh replaces genre/monthly series instead of accumulating values', async () => {
  const genre = mountGenre();
  const monthly = mountMonthly();
  const changed = { ...data(), movies_by_gender: { Drama: 5 }, movies_six_months_ago: { July: 5 } };
  await genre.setProps({ chartsData: changed });
  await monthly.setProps({ chartsData: changed });
  expect(genre.findAll('.mm-genre-label').map((row) => row.text())).toEqual(['Drama5']);
  expect(monthly.findComponent(ApexChart).props('series')).toEqual([{ name: 'Filmes', data: [5] }]);
  await genre.setProps({ chartsData: { ...changed } });
  expect(genre.findAll('.mm-genre-label').map((row) => row.text())).toEqual(['Drama5']);
});
test('chart instances have unique IDs and react to light theme with readable text', async () => {
  const host = defineComponent({
    components: { MovieByGenderChart, MovieSixMonthsAgoChart },
    setup: () => ({ stats: data() }),
    template:
      '<div><MovieSixMonthsAgoChart :charts-data="stats" /><MovieSixMonthsAgoChart :charts-data="stats" /></div>',
  });
  const wrapper = mount(host, { global: { components: { ApexChart } } });
  wrappers.push(wrapper);
  const charts = wrapper.findAllComponents(ApexChart);
  const ids = charts.map((chart) => chart.props('options').chart.id);
  expect(new Set(ids).size).toBe(2);
  useStyleStore().setTheme(false);
  await nextTick();
  for (const chart of charts) {
    const options = chart.props('options');
    expect(options.chart.foreColor).toBe('#203247');
    expect(options.theme.mode).toBe('light');
    expect(options.colors[0]).toBe('#00f6ff');
  }
});

test('genre bars show sorted absolute counts and explain multiple genres', async () => {
  const genre = mountGenre();
  await genre.setProps({
    chartsData: { ...data(), movies_by_gender: { Comedy: 2, Drama: 10, Action: 5 } },
  });
  expect(genre.findAll('.mm-genre-label').map((row) => row.text())).toEqual([
    'Drama10',
    'Ação5',
    'Comédia2',
  ]);
  expect(genre.text()).toContain('Um filme pode ter mais de um gênero');
  expect(genre.findComponent(ApexChart).exists()).toBe(false);
});
test('monthly chart labels actual API range, integer ticks and hides zero labels', async () => {
  const monthly = mountMonthly();
  await monthly.setProps({
    chartsData: { ...data(), movies_six_months_ago: { '2026-05': 0, '2026-06': 4, '2026-07': 1 } },
  });
  expect(monthly.find('.mm-month-range').text()).toBe('mai – jul · 2026 · 3 meses');
  const options = monthly.findComponent(ApexChart).props('options');
  expect(options.xaxis.categories).toEqual(['mai', 'jun', 'jul']);
  expect(options.yaxis.labels.formatter(0.5)).toBe('');
  expect(options.yaxis.labels.formatter(2)).toBe('2');
  expect(options.dataLabels.formatter(0)).toBe('');
  expect(options.dataLabels.formatter(4)).toBe('4');
  await monthly.setProps({ chartsData: { ...data(), movies_six_months_ago: { '2026-05': 0 } } });
  expect(monthly.findComponent(ApexChart).exists()).toBe(false);
  expect(monthly.text()).toContain('Nenhum filme registrado');
});

test('monthly subtitle preserves backend Portuguese month years across a year boundary', async () => {
  const monthly = mountMonthly();
  await monthly.setProps({
    chartsData: { ...data(), movies_six_months_ago: { 'dezembro - 2025': 1, 'janeiro - 2026': 2 } },
  });
  expect(monthly.find('.mm-month-range').text()).toBe('dez – jan · 2025–2026 · 2 meses');
  expect(monthly.findComponent(ApexChart).props('options').xaxis.categories).toEqual([
    'dez',
    'jan',
  ]);
});
