import { flushPromises, shallowMount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import MovieChartsView from '../../src/modules/movie-charts/views/MovieChartsView.vue';
import type { MovieStatistics } from '../../src/core/types/statistics/Statistics';
const mocks = vi.hoisted(() => ({
  movies: vi.fn(),
  getUser: vi.fn(),
  showError: vi.fn(),
  store: { user: { id: 'one', generation: 'first', isLoged: true } },
}));
vi.mock('src/modules/movie-charts/services/StatisticService', () => ({ default: mocks }));
vi.mock('src/core/services/UserService', () => ({ default: mocks }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.store }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showError: mocks.showError }));
const catalog: MovieStatistics = {
  total_number_of_movies: 336,
  average_rate: 6.8,
  average_runtime: 117,
  movies_by_gender: { Thriller: 142 },
  movies_six_months_ago: { 'outubro - 2026': 1 },
};
const profile = (id = 'one', score = 7.5) => ({
  id,
  statistics: {
    ratings_given: 24,
    registered_movies: 7,
    display_time: 3000,
    average_rating_movies: score,
  },
});
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { resolve, reject, promise };
}
function mountDashboard() {
  return shallowMount(MovieChartsView, {
    global: { stubs: { BaseContainerMain: { template: '<main><slot /></main>' } } },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.store = reactive({ user: { id: 'one', generation: 'first', isLoged: true } });
  mocks.movies.mockResolvedValue(catalog);
  mocks.getUser.mockResolvedValue(profile());
});
test('statistics distinguish initial skeleton/error/empty data and retain data on refresh', async () => {
  const first = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(first.promise);
  const wrapper = mountDashboard();
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(true);
  expect(wrapper.find('.mm-stat-grid').exists()).toBe(false);
  first.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  expect(
    wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('statistics').ratings_given,
  ).toBe(24);
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
  expect(wrapper.text()).toContain('O catálogo ainda está vazio');
  expect(wrapper.find('[role="meter"]').exists()).toBe(false);
  const refresh = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(refresh.promise);
  await wrapper.get('button').trigger('click');
  expect(wrapper.find('.mm-stat-grid').exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  refresh.resolve(empty);
  await flushPromises();
  wrapper.unmount();
});
test('pending and failed personal requests do not hide successful catalog data, and refresh retries', async () => {
  const personal = pending<ReturnType<typeof profile>>();
  mocks.getUser.mockReturnValue(personal.promise);
  const wrapper = mountDashboard();
  await flushPromises();
  expect(wrapper.find('.mm-stat-grid').exists()).toBe(true);
  expect(wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('loading')).toBe(true);
  personal.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('error')).toContain(
    'suas estatísticas',
  );
  expect(wrapper.find('.mm-genres-card').exists()).toBe(true);
  expect(mocks.showError).not.toHaveBeenCalled();
  mocks.getUser.mockResolvedValue(profile());
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(
    wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('statistics').ratings_given,
  ).toBe(24);
  expect(wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('error')).toBe('');
  wrapper.unmount();
});
test('refresh preserves both successful snapshots when later requests fail', async () => {
  const wrapper = mountDashboard();
  await flushPromises();
  mocks.movies.mockRejectedValue(new Error('offline'));
  mocks.getUser.mockRejectedValue(new Error('offline'));
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('336');
  expect(
    wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('statistics')
      .average_rating_movies,
  ).toBe(7.5);
  expect(wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('error')).not.toBe('');
  wrapper.unmount();
});
test.each(['account', 'session'] as const)(
  'discards old results and clears visible data on %s replacement',
  async (replacement) => {
    const wrapper = mountDashboard();
    await flushPromises();
    const oldCatalog = pending<MovieStatistics>();
    const oldProfile = pending<ReturnType<typeof profile>>();
    mocks.movies.mockReturnValueOnce(oldCatalog.promise);
    mocks.getUser.mockReturnValueOnce(oldProfile.promise);
    await wrapper.get('button').trigger('click');
    const newCatalog = pending<MovieStatistics>();
    const newProfile = pending<ReturnType<typeof profile>>();
    mocks.movies.mockReturnValueOnce(newCatalog.promise);
    mocks.getUser.mockReturnValueOnce(newProfile.promise);
    const nextId = replacement === 'account' ? 'two' : 'one';
    mocks.store.user = { id: nextId, generation: 'second', isLoged: true };
    await flushPromises();
    expect(wrapper.find('.mm-stat-grid').exists()).toBe(false);
    newCatalog.resolve({ ...catalog, total_number_of_movies: 99 });
    newProfile.resolve(profile(nextId, 8.1));
    await flushPromises();
    oldCatalog.resolve(catalog);
    oldProfile.resolve(profile('one', 2.5));
    await flushPromises();
    expect(wrapper.text()).toContain('99');
    expect(wrapper.text()).not.toContain('336');
    expect(
      wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('statistics')
        .average_rating_movies,
    ).toBe(8.1);
    wrapper.unmount();
  },
);
test('logout clears visible data and blocks in-flight results', async () => {
  const wrapper = mountDashboard();
  await flushPromises();
  const next = pending<ReturnType<typeof profile>>();
  mocks.getUser.mockReturnValue(next.promise);
  await wrapper.get('button').trigger('click');
  mocks.store.user.isLoged = false;
  await flushPromises();
  next.resolve(profile());
  await flushPromises();
  expect(wrapper.find('.mm-stat-grid').exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'PersonalStatisticsCard' }).exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  wrapper.unmount();
});
test('mismatched profile identity cannot populate personal data', async () => {
  mocks.getUser.mockResolvedValue(profile('someone-else'));
  const wrapper = mountDashboard();
  await flushPromises();
  expect(
    wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('statistics'),
  ).toBeUndefined();
  expect(wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('error')).not.toBe('');
  wrapper.unmount();
});
test('unmount rejects late errors and does not announce stale failures', async () => {
  const request = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(request.promise);
  const wrapper = mountDashboard();
  wrapper.unmount();
  request.reject(new Error('offline'));
  await flushPromises();
  expect(mocks.showError).not.toHaveBeenCalled();
});
test('null site aggregates remain unavailable rather than becoming zero', async () => {
  mocks.movies.mockResolvedValue({ ...catalog, average_runtime: null, average_rate: null });
  const wrapper = mountDashboard();
  await flushPromises();
  expect(wrapper.findAll('.mm-stat-card strong').map((value) => value.text())).toEqual([
    '336',
    '—',
    '—',
  ]);
  expect(wrapper.find('[role="meter"]').exists()).toBe(false);
  wrapper.unmount();
});

test('completed personal statistics remain visible while the catalog is still loading', async () => {
  const site = pending<MovieStatistics>();
  mocks.movies.mockReturnValue(site.promise);
  const wrapper = mountDashboard();
  await flushPromises();
  expect(
    wrapper
      .findAllComponents({ name: 'StatisticsLoadingState' })
      .map((component) => component.props('part')),
  ).toEqual(['summary', 'monthly', 'genres']);
  const personal = wrapper.getComponent({ name: 'PersonalStatisticsCard' });
  expect(personal.isVisible()).toBe(true);
  expect(personal.props('statistics').average_rating_movies).toBe(7.5);
  expect(personal.props('loading')).toBe(false);
  expect(personal.props('chartsData')).toBeUndefined();
  site.resolve(catalog);
  await flushPromises();
  expect(wrapper.findComponent({ name: 'StatisticsLoadingState' }).exists()).toBe(false);
  expect(wrapper.getComponent({ name: 'PersonalStatisticsCard' }).props('chartsData')).toEqual(
    catalog,
  );
  wrapper.unmount();
});
test('catalog and personal status/error announcements are outside busy or decorative ancestors', async () => {
  const site = pending<MovieStatistics>();
  const personal = pending<ReturnType<typeof profile>>();
  mocks.movies.mockReturnValue(site.promise);
  mocks.getUser.mockReturnValue(personal.promise);
  const wrapper = shallowMount(MovieChartsView, {
    global: {
      stubs: {
        BaseContainerMain: { template: '<main><slot /></main>' },
        StatisticsLoadingState: false,
        PersonalStatisticsCard: false,
        BaseLoadingState: false,
        BaseSkeleton: false,
      },
    },
  });
  const status = wrapper.findAll('[role="status"]');
  expect(status).toHaveLength(2);
  for (const announcement of status) {
    expect(announcement.element.closest('[aria-busy="true"], [aria-hidden="true"]')).toBeNull();
  }
  personal.reject(new Error('offline'));
  await flushPromises();
  const personalError = wrapper.get('.mm-personal-card [role="alert"]');
  expect(personalError.element.closest('[aria-busy="true"], [aria-hidden="true"]')).toBeNull();
  expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
  site.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.findAll('[role="status"]')).toHaveLength(0);
  for (const alert of wrapper.findAll('[role="alert"]')) {
    expect(alert.element.closest('[aria-busy="true"], [aria-hidden="true"]')).toBeNull();
  }
  wrapper.unmount();
});
