/** Browser requests retain relative URLs. SSR Axios needs an absolute same-origin URL. */
export function resolveApiBaseURL(baseURL: string | undefined, requestOrigin?: string) {
  if (!baseURL) return undefined;
  if (baseURL.startsWith('/') && !baseURL.startsWith('//') && requestOrigin) {
    return new URL(baseURL, requestOrigin).toString().replace(/\/$/, '');
  }
  return baseURL;
}
