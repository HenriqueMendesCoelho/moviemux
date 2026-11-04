import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import PersonalStatisticsCard from '../../src/modules/movie-charts/components/PersonalStatisticsCard.vue';
import StatisticsLoadingState from '../../src/modules/movie-charts/components/StatisticsLoadingState.vue';
import {
  formatDuration,
  personalAverages,
  personalStatistics,
} from '../../src/modules/movie-charts/utils/statisticsComparison';
const personal = personalStatistics({
  ratings_given: 24,
  registered_movies: 7,
  display_time: 3000,
  average_rating_movies: 7.5,
});
const catalog = {
  total_number_of_movies: 336,
  average_rate: 6.8,
  average_runtime: 117,
  movies_by_gender: {},
  movies_six_months_ago: {},
};
test('uses rating-weighted user aggregates and distinguishes the runtime populations and lifetime scope', () => {
  const wrapper = mount(PersonalStatisticsCard, {
    props: { statistics: personal, chartsData: catalog, loading: false, error: '' },
  });
  expect(personalAverages(personal)).toEqual({ rating: 7.5, runtime: 125 });
  expect(wrapper.text()).toContain('todo o período');
  expect(wrapper.text()).toContain('Suas avaliações × todas as avaliações do site.');
  expect(wrapper.text()).toContain('Filmes que você avaliou × todos os filmes do catálogo.');
  expect(wrapper.text()).toContain('2h 5min');
  expect(wrapper.text()).toContain('1h 57min');
  expect(wrapper.text()).toContain('7,5');
  expect(wrapper.text()).toContain('6,8');
  expect(wrapper.findAll('dd').map((value) => value.text())).toEqual(['24', '7', '50h']);
  expect(wrapper.text()).not.toMatch(/percentil|ranking|por usuário|acima da média/i);
});
test('zero ratings yields unavailable personal means and real zero totals, never NaN', () => {
  const zero = personalStatistics({
    ratings_given: 0,
    registered_movies: 0,
    display_time: 0,
    average_rating_movies: 0,
  });
  expect(personalAverages(zero)).toEqual({ rating: null, runtime: null });
  const wrapper = mount(PersonalStatisticsCard, {
    props: { statistics: zero, chartsData: catalog, loading: false, error: '' },
  });
  expect(wrapper.findAll('dd').map((value) => value.text())).toEqual(['0', '0', '0min']);
  expect(wrapper.text()).toContain('Avalie um filme');
  expect(wrapper.text()).not.toContain('NaN');
});
test('a valid zero personal mean is retained and a zero site mean remains explicitly ambiguous', () => {
  const wrapper = mount(PersonalStatisticsCard, {
    props: {
      statistics: { ...personal, average_rating_movies: 0 },
      chartsData: { ...catalog, average_rate: 0 },
      loading: false,
      error: '',
    },
  });
  expect(wrapper.text()).toContain('0,0');
  expect(wrapper.text()).toContain('zero tanto para média zero quanto para ausência de avaliações');
  expect(personalAverages({ ...personal, average_rating_movies: 0 }).rating).toBe(0);
});
test.each([
  null,
  undefined,
  {},
  {
    ratings_given: NaN,
    registered_movies: -1,
    display_time: Infinity,
    average_rating_movies: null,
  },
  { ratings_given: '12', registered_movies: 1.5, display_time: -5, average_rating_movies: 11 },
])('missing or invalid metrics are unavailable, not invented: %s', (value) => {
  const stats = personalStatistics(value);
  expect(stats).toEqual({
    ratings_given: null,
    registered_movies: null,
    display_time: null,
    average_rating_movies: null,
  });
  expect(personalAverages(stats)).toEqual({ rating: null, runtime: null });
});
test('duration rounding carries minutes correctly and zero stays distinct from unavailable', () => {
  expect(formatDuration(119.9)).toBe('2h');
  expect(formatDuration(0)).toBe('0min');
  expect(formatDuration(null)).toBe('—');
});
test('independent site skeleton regions mirror summary, monthly and horizontal genre content', () => {
  const summary = mount(StatisticsLoadingState, { props: { part: 'summary' } });
  const monthly = mount(StatisticsLoadingState, { props: { part: 'monthly' } });
  const genres = mount(StatisticsLoadingState, { props: { part: 'genres' } });
  expect(summary.findAll('.mm-stat-loading-card')).toHaveLength(3);
  expect(monthly.findAll('.mm-chart-loading-bars > *')).toHaveLength(7);
  expect(genres.findAll('.mm-genres-loading-bars > div')).toHaveLength(18);
  for (const wrapper of [summary, monthly, genres]) {
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(wrapper.attributes('aria-busy')).toBe('true');
  }
  const view = readFileSync('src/modules/movie-charts/views/MovieChartsView.vue', 'utf8');
  expect(view).toContain('align-items: start');
  expect(view).toContain('@media (max-width: 850px)');
  expect(view).toContain('grid-template-columns: 1fr');
});
