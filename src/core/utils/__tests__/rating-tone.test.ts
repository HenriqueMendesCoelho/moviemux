import { describe, expect, it } from 'vitest';
import { ratingTone } from '../RatingUtils';

describe('raw rating color policy', () => {
  it.each([
    [10, 'perfect'],
    [9.99, 'good'],
    [9.95, 'good'],
    [9.9, 'good'],
    [7.01, 'good'],
    [7, 'medium'],
    [5.01, 'medium'],
    [5, 'low'],
    [0, 'low'],
    [null, 'low'],
    [undefined, 'low'],
    [Number.NaN, 'low'],
  ] as const)('classifies %s without display rounding', (value, expected) => {
    expect(ratingTone(value)).toBe(expected);
  });
});
