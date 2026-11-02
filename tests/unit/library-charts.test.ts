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
  expect(genre.findComponent(ApexChart).props('series')).toEqual([5]);
  expect(monthly.findComponent(ApexChart).props('series')).toEqual([{ name: 'Filmes', data: [5] }]);
  await genre.setProps({ chartsData: { ...changed } });
  expect(genre.findComponent(ApexChart).props('series')).toEqual([5]);
});
test('chart instances have unique IDs and react to light theme with readable text', async () => {
  const host = defineComponent({
    components: { MovieByGenderChart, MovieSixMonthsAgoChart },
    setup: () => ({ stats: data() }),
    template:
      '<div><MovieByGenderChart :charts-data="stats" /><MovieByGenderChart :charts-data="stats" /><MovieSixMonthsAgoChart :charts-data="stats" /></div>',
  });
  const wrapper = mount(host, { global: { components: { ApexChart } } });
  wrappers.push(wrapper);
  const charts = wrapper.findAllComponents(ApexChart);
  const ids = charts.map((chart) => chart.props('options').chart.id);
  expect(new Set(ids).size).toBe(3);
  useStyleStore().setTheme(false);
  await nextTick();
  for (const chart of charts) {
    const options = chart.props('options');
    expect(options.chart.foreColor).toBe('#203247');
    expect(options.theme.mode).toBe('light');
    expect(options.colors[0]).toBe('#00f6ff');
  }
});
