import { expect, test } from 'vitest';
import { formatRatingMean } from '../../src/modules/ranking/utils/formatRatingMean';
test.each([
  [0n, 1n, '0.0', '0,0'],
  [7n, 1n, '7.0', '7,0'],
  [20n, 3n, '6.7', '6,7'],
  [5n, 4n, '1.3', '1,3'],
  [124n, 100n, '1.2', '1,2'],
  [125n, 100n, '1.3', '1,3'],
  [-5n, 4n, '-1.3', '-1,3'],
  [-124n, 100n, '-1.2', '-1,2'],
  [-1n, 100n, '-0.0', '-0,0'],
  [999n, 100n, '10.0', '10,0'],
  [-999n, 100n, '-10.0', '-10,0'],
  [90071992547409931n, 10n, '9,007,199,254,740,993.1', '9.007.199.254.740.993,1'],
  [-90071992547409935n, 10n, '-9,007,199,254,740,993.5', '-9.007.199.254.740.993,5'],
])('formats exact %s / %s in both locales', (total, votes, en, pt) => {
  expect(formatRatingMean(total as bigint, votes as bigint, 'en')).toBe(en);
  expect(formatRatingMean(total as bigint, votes as bigint, 'pt-BR')).toBe(pt);
});
test('absent numeric votes never create a mean, distinct from a real zero', () => {
  expect(formatRatingMean(0n, 0n, 'pt-BR')).toBeNull();
  expect(formatRatingMean(100n, 0n, 'en')).toBeNull();
  expect(formatRatingMean(0n, 1n, 'pt-BR')).toBe('0,0');
});
test('matches existing Intl convention for finite small ratios including ties and historical negatives', () => {
  for (let total = -100; total <= 100; total++)
    for (let votes = 1; votes <= 13; votes++) {
      const expected = new Intl.NumberFormat('en', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(total / votes);
      expect(formatRatingMean(BigInt(total), BigInt(votes), 'en')).toBe(expected);
    }
});
