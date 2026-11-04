import { flushPromises, shallowMount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import MovieChartsView from '../../src/modules/movie-charts/views/MovieChartsView.vue';
import type { MovieStatistics } from '../../src/core/types/statistics/Statistics';
const mocks = vi.hoisted(() => ({ movies: vi.fn(), user: { id: 'one', isLoged: true } }));
vi.mock('src/modules/movie-charts/services/StatisticService', () => ({ default: mocks }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => ({ user: mocks.user }) }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showError: vi.fn() }));
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { resolve, reject, promise };
}
test('statistics distinguish initial skeleton/error/empty data and retain data on refresh', async () => {
  const first = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(first.promise);
  const wrapper = shallowMount(MovieChartsView, {
    global: {
      stubs: {
        BaseContainerMain: { template: '<main><slot /></main>' },
      },
    },
  });
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(true);
  expect(wrapper.find('.mm-stat-grid').exists()).toBe(false);
  first.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  const retry = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(retry.promise);
  await wrapper.get('button').trigger('click');
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(true);
  const empty: MovieStatistics = {
    total_number_of_movies: 0,
    average_rate: 0,
    average_runtime: 0,
    movies_by_gender: {},
    movies_six_months_ago: {},
  };
  retry.resolve(empty);
  await flushPromises();
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  expect(wrapper.text()).toContain('Sua coleção ainda está vazia');
  const refresh = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(refresh.promise);
  await wrapper.get('button').trigger('click');
  expect(wrapper.find('.mm-stat-grid').exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  refresh.resolve(empty);
  await flushPromises();
  wrapper.unmount();
});
