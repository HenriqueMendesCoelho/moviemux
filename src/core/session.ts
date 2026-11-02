/** Read only our non-HttpOnly legacy auth cookie, never a global server cookie jar. */
export function readBrowserAuthToken(): string {
  if (typeof document === 'undefined') return '';
  const value = document.cookie
    .split('; ')
    .find((part) => part.startsWith('auth-kb='))
    ?.slice(8);
  if (!value) return '';
  try {
    return decodeURIComponent(value).replace(/^"|"$/g, '');
  } catch {
    return '';
  }
}
