export function isNeutralCollectionRoute(route: {
  name?: unknown;
  path?: unknown;
  meta?: unknown;
}): boolean {
  // Routes with a malformed ID or trailing slash still render the anonymous
  // unavailable state, not a session bootstrap. Only this named page bypasses it.
  return (
    route.name === 'public-collection' &&
    typeof route.meta === 'object' &&
    route.meta !== null &&
    'publicCollection' in route.meta &&
    route.meta.publicCollection === true &&
    typeof route.path === 'string' &&
    /^\/public\/movies\/collections\/[^/?#]+\/?$/.test(route.path)
  );
}
