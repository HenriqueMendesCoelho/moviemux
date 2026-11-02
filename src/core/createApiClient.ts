import axios, { AxiosError, type AxiosAdapter } from 'axios';
export interface ApiClientOptions {
  getCsrfToken: () => string | null | undefined;
  onUnauthorized: () => void;
  getSessionGeneration?: () => string;
  adapter?: AxiosAdapter;
}
/** Reject off-origin URLs and ambiguous path forms before forwarding cookies. */
export function safeApiPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || '';
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error('Invalid API path');
  }
  if (
    !decoded.startsWith('/api/') ||
    decoded.includes('\\') ||
    decoded.includes('//') ||
    Array.from(decoded).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '%',
    ) ||
    decoded.split('/').some((part) => part === '.' || part === '..')
  ) {
    throw new Error('Only same-origin API paths are allowed');
  }
  return path;
}
export interface InternalFetchResponse {
  _data?: unknown;
  status: number;
  statusText: string;
  headers: Headers;
}
export type InternalApiFetch = (
  path: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    ignoreResponseError: true;
    signal?: AbortSignal;
  },
) => Promise<InternalFetchResponse>;
/** Nuxt's request-scoped $fetch is callable but has no `.raw` method at runtime. */
export type RequestScopedFetch = (
  path: string,
  options: Parameters<InternalApiFetch>[1] & {
    retry: 0;
    timeout: number;
    onResponse: (context: { response: InternalFetchResponse }) => void;
  },
) => Promise<unknown>;
export function requestFetchBridge(requestFetch: RequestScopedFetch): InternalApiFetch {
  return async (path, options) => {
    let response: InternalFetchResponse | undefined;
    await requestFetch(safeApiPath(path), {
      ...options,
      retry: 0,
      timeout: 20000,
      onResponse: (context) => {
        response = context.response;
      },
    });
    if (!response) throw new Error('Internal fetch did not provide a response');
    return response;
  };
}
/** SSR adapter uses Nuxt's internal request fetch, never a Host-derived origin. */
export function createInternalApiAdapter(fetch: InternalApiFetch): AxiosAdapter {
  return async (config) => {
    const path = safeApiPath(axios.getUri(config));
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.headers.toJSON())) {
      if (value != null && !['authorization', 'host', 'cookie'].includes(key.toLowerCase()))
        headers[key] = String(value);
    }
    const result = await fetch(path, {
      method: (config.method || 'get').toUpperCase(),
      headers,
      body: config.data,
      ignoreResponseError: true,
      signal: config.signal as AbortSignal | undefined,
    });
    const response = {
      data: result._data,
      status: result.status,
      statusText: result.statusText,
      headers: Object.fromEntries(result.headers.entries()),
      config,
    };
    if (config.validateStatus && !config.validateStatus(response.status)) {
      throw new AxiosError(
        'API request failed',
        response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        response,
      );
    }
    return response;
  };
}
/** One client per Nuxt app/request; only the server BFF handles credentials. */
export function createApiClient({
  getCsrfToken,
  onUnauthorized,
  adapter,
  getSessionGeneration,
}: ApiClientOptions) {
  const api = axios.create({ baseURL: '/api', timeout: 20000, ...(adapter ? { adapter } : {}) });
  const generations = new WeakMap<object, string>();
  api.interceptors.request.use((request) => {
    if (getSessionGeneration) generations.set(request, getSessionGeneration());
    safeApiPath(axios.getUri(request));
    request.headers.delete('Authorization');
    request.headers.delete('x-csrf-token');
    if (!['get', 'head', 'options'].includes(request.method || 'get')) {
      const csrf = getCsrfToken();
      if (csrf) request.headers.set('x-csrf-token', csrf);
    }
    return request;
  });
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response?.status === 401 &&
        (!getSessionGeneration ||
          (error.config && generations.get(error.config) === getSessionGeneration())) &&
        !['/login', '/_auth/session', '/logout'].includes(error.config?.url)
      )
        onUnauthorized();
      return Promise.reject(error);
    },
  );
  return api;
}
