import { readFileSync } from 'node:fs';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import BaseChipNote from '../BaseChipNote.vue';
import Movie from 'src/core/domain/movie/movie';

function movieWithScores(scores: number[]) {
  const movie = new Movie();
  movie.notes = scores.map((note) => ({ note })) as NonNullable<Movie['notes']>;
  return movie;
}

afterEach(() => document.documentElement.removeAttribute('data-theme'));

describe('visible movie rating badge', () => {
  it.each(['light', 'dark'])('uses exact cyan for ten in the %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    const wrapper = mount(BaseChipNote, { props: { movie: movieWithScores([10, 10]) } });
    expect(wrapper.classes()).toContain('mm-rating-perfect');
    expect(wrapper.attributes('aria-label')).toBe('Nota média 10,0');
    wrapper.unmount();
  });

  it.each([9.9, 9.99, 9.95])('does not color a rounded %s average cyan', (score) => {
    const wrapper = mount(BaseChipNote, { props: { movie: movieWithScores([score]) } });
    expect(wrapper.classes()).toContain('mm-rating-good');
    expect(wrapper.classes()).not.toContain('mm-rating-perfect');
    wrapper.unmount();
  });

  it('preserves zero and empty averages, then updates to exact ten', async () => {
    const wrapper = mount(BaseChipNote, { props: { movie: movieWithScores([0]) } });
    expect(wrapper.text()).toContain('0,0');
    expect(wrapper.classes()).toContain('mm-rating-low');
    await wrapper.setProps({ movie: movieWithScores([]) });
    expect(wrapper.classes()).toContain('mm-rating-low');
    await wrapper.setProps({ movie: movieWithScores([10]) });
    expect(wrapper.classes()).toContain('mm-rating-perfect');
    wrapper.unmount();
  });

  it('keeps cyan text accessible on its opaque badge surface in both themes', () => {
    const source = readFileSync('src/core/components/BaseChipNote.vue', 'utf8');
    const background = source.match(/\.mm-rating\s*\{[^}]*background:\s*(#[\da-f]{6})/i)?.[1];
    const foreground = source.match(/\.mm-rating-perfect\s*\{\s*color:\s*(#[\da-f]{6})/i)?.[1];
    expect(foreground).toBe('#00f6ff');
    expect(background).toBe('#282d39');
    function luminance(hex: string) {
      const channels = hex
        .slice(1)
        .match(/../g)!
        .map((part) => {
          const value = Number.parseInt(part, 16) / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
      return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
    }
    expect((luminance(foreground!) + 0.05) / (luminance(background!) + 0.05)).toBeGreaterThan(4.5);
  });
});
