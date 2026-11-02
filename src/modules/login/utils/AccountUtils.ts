/** Accept only local route paths, never protocol-relative or browser-normalized hosts. */
export function safeReturnPath(value: unknown, fallback = '/home'): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return fallback;
  return value;
}
