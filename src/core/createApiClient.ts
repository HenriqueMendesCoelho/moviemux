import axios from 'axios';
export interface ApiClientOptions {
  baseURL?: string;
  getToken: () => string | null | undefined;
  onUnauthorized: () => void;
}
/** One client per Nuxt app/request. Never install interceptors on global axios. */
export function createApiClient({ baseURL, getToken, onUnauthorized }: ApiClientOptions) {
  const api = axios.create({ baseURL, timeout: 20000 });
  api.interceptors.request.use((request) => {
    const token = getToken();
    if (token) request.headers.Authorization = `Bearer ${token}`;
    return request;
  });
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) onUnauthorized();
      return Promise.reject(error);
    },
  );
  return api;
}
