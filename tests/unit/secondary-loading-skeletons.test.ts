import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import WatchlistLoadingState from '../../src/modules/movie-watchlist/components/WatchlistLoadingState.vue';
import StatisticsLoadingState from '../../src/modules/movie-charts/components/StatisticsLoadingState.vue';
import ProfileLoadingState from '../../src/modules/profile/components/ProfileLoadingState.vue';

test.each([
  ['lists', WatchlistLoadingState, {}],
  ['list', WatchlistLoadingState, { detail: true }],
  ['profile', ProfileLoadingState, {}],
] as const)(
  '%s initial state has one announcement and no fake interactive content',
  (_, component, props) => {
    const wrapper = mount(component, { props });
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    const shapes = wrapper.get('.mm-loading-shapes');
    expect(shapes.attributes('aria-hidden')).toBe('true');
    expect(shapes.findAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(shapes.text()).toBe('');
    expect(shapes.findAll('.mm-skeleton').length).toBeGreaterThan(5);
    wrapper.unmount();
  },
);

test.each(['summary', 'monthly', 'genres'] as const)(
  'statistics %s is decorative; its route owns the live announcement',
  (part) => {
    const wrapper = mount(StatisticsLoadingState, { props: { part } });
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0);
    expect(wrapper.findAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(wrapper.text()).toBe('');
    expect(wrapper.findAll('.mm-skeleton').length).toBeGreaterThan(5);
    wrapper.unmount();
  },
);
