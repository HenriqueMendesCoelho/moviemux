/** Logical legacy paths keep one authority/DTO policy for both collection namespaces.
 * The original outward path is still forwarded upstream and is never redirected.
 */
export function collectionContractPath(path: string): string {
  const incoming = '/movies/collections/invitations/incoming';
  if (path === incoming || path.startsWith(incoming + '?')) {
    return '/ranking-invitations/incoming' + path.slice(incoming.length);
  }
  const canonical = '/movies/collections';
  if (path === canonical || path.startsWith(canonical + '/') || path.startsWith(canonical + '?')) {
    return '/rankings' + path.slice(canonical.length);
  }
  return path;
}
