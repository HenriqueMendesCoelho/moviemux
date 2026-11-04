import { describe, expect, it } from 'vitest';
import DateUtils from '../../src/core/utils/DateUtils';

describe('localized date utilities', () => {
  it.each(['pt-BR', 'en'])('uses neutral output for invalid dates in %s', (locale) => {
    for (const date of ['invalid', '2026-99-99', new Date(NaN)]) {
      expect(DateUtils.toLocaleString(date, locale)).toBe('—');
      expect(DateUtils.toLocaleDateString(date, locale)).toBe('—');
      expect(DateUtils.toLocaleDateStringLong(date, locale)).toBe('—');
    }
    expect(DateUtils.toLocaleString('', locale)).toBe('—');
    expect(DateUtils.toLocaleDateString(undefined, locale)).toBe('—');
    expect(DateUtils.toLocaleDateStringLong(undefined, locale)).toBe('—');
  });

  it.each(['pt-BR', 'en'])(
    'retains date-only noon and current timestamp interpretation in %s',
    (locale) => {
      const localNoon = new Date('2026-01-02T12:00:00');
      expect(DateUtils.toLocaleDateString('2026-01-02', locale)).toBe(
        localNoon.toLocaleDateString(locale),
      );
      expect(DateUtils.toLocaleDateString('2026-01-02T00:10:00Z', locale)).toBe(
        localNoon.toLocaleDateString(locale),
      );
      expect(DateUtils.toLocaleDateString(new Date('2026-01-02T00:10:00Z'), locale)).toBe(
        localNoon.toLocaleDateString(locale),
      );
      const timestamp = new Date('2026-01-02T14:30:00Z');
      expect(DateUtils.toLocaleString(timestamp, locale)).toBe(
        timestamp.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }),
      );
      expect(DateUtils.toLocaleDateStringLong(timestamp, locale)).toBe(
        timestamp.toLocaleString(locale, { dateStyle: 'long' }),
      );
    },
  );
});
