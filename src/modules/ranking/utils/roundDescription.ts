// Java Character.isWhitespace/isSpaceChar plus U+0085 on the V14 backend.
// ECMAScript trim differs (FEFF, NEL and the ASCII information separators).
const separator = /^\p{Z}$/u;
function whitespace(point: string) {
  const code = point.codePointAt(0) ?? -1;
  return (
    (code >= 9 && code <= 13) || (code >= 28 && code <= 31) || code === 133 || separator.test(point)
  );
}
export function canonicalRoundDescription(value: string | null): string | null | undefined {
  if (value === null) return null;
  const points = Array.from(value);
  let start = 0,
    end = points.length;
  while (start < end && whitespace(points[start]!)) start++;
  while (end > start && whitespace(points[end - 1]!)) end--;
  if (start === end) return null;
  if (end - start > 240) return undefined;
  const trimmed = points.slice(start, end);
  if (
    trimmed.some((point) => {
      const code = point.codePointAt(0) ?? 0;
      return code === 0 || (code >= 0xd800 && code <= 0xdfff);
    })
  )
    return undefined;
  return trimmed.join('');
}
