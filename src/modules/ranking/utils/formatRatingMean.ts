/** Match the site's one-decimal display convention without rounding large sums through Number. */
export function formatRatingMean(total: bigint, votes: bigint, locale: string): string | null {
  if (votes <= 0n) return null;
  const negative = total < 0n;
  const numerator = (negative ? -total : total) * 10n;
  let tenths = numerator / votes;
  // Intl's existing halfExpand convention: halfway cases round away from zero.
  if ((numerator % votes) * 2n >= votes) tenths++;
  const integer = tenths / 10n;
  const signed = negative ? (integer === 0n ? -0 : -integer) : integer;
  const digit = new Intl.NumberFormat(locale, { useGrouping: false }).format(tenths % 10n);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
    .formatToParts(signed)
    .map((part) => (part.type === 'fraction' ? digit : part.value))
    .join('');
}
