import { readFileSync } from 'node:fs';
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { compileStyle, parse } from 'vue/compiler-sfc';
import BaseSkeleton from '../../src/core/components/BaseSkeleton.vue';
import MoviePageSkeleton from '../../src/modules/movie/components/MoviePageSkeleton.vue';

test.each([
  ['film', MoviePageSkeleton, {}],
  ['editor', MoviePageSkeleton, { editing: true }],
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

test('primitive supports reserved geometry and reduced-motion without depending on JS animation', () => {
  const wrapper = mount(BaseSkeleton, {
    props: { shape: 'block', width: '120px', height: '180px' },
  });
  expect(wrapper.attributes('aria-hidden')).toBe('true');
  expect(wrapper.attributes('style')).toContain('height: 180px');
  const source = readFileSync('src/core/components/BaseSkeleton.vue', 'utf8');
  const style = parse(source).descriptor.styles[0]!.content;
  expect(style).toContain('color-mix(in srgb, var(--mm-text) 16%, var(--mm-raised))');
  expect(style).toContain('opacity: 0.75');
  expect(style).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation: none/);
  expect(compileStyle({ source: style, id: 'skeleton', scoped: true }).errors).toEqual([]);
  wrapper.unmount();
});

test('film geometry follows actual detail breakpoint, not summary-dialog layout', () => {
  const source = readFileSync('src/modules/movie/components/MoviePageSkeleton.vue', 'utf8');
  expect(source).toContain('max-width: 750px');
  expect(source).toContain('280px');
  expect(source).toContain('120px');
  expect(source).not.toContain('104px');
});

test('summary refresh does not add a second loading announcement beside existing content', () => {
  const source = readFileSync('src/core/components/BaseFormMovieSummary.vue', 'utf8');
  expect(source).toContain('v-if="loading && !movie" class="mm-sr-only" role="status"');
  expect(source).toContain('v-if="loading && movie" class="mm-summary-refresh" role="status"');
});

test('loading navigation reserves the loaded toolbar gap on both film routes', () => {
  for (const file of ['MovieView.vue', 'MovieEditView.vue']) {
    const source = readFileSync(`src/modules/movie/views/${file}`, 'utf8');
    expect(source).toContain('class="mm-movie-loading-actions"');
    expect(source).toMatch(
      /\.mm-movie-loading-actions\s*\{[^}]*min-height: 46px;[^}]*margin-bottom: 2rem;/,
    );
  }
});
