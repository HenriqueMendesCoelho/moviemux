import type { AxiosInstance } from 'axios';
import { useNuxtApp } from '#app';
// Resolve the request-scoped client when a method is invoked, never at module load.
export default new Proxy({} as AxiosInstance, {
  get(_target, key) {
    const client = useNuxtApp().$api as AxiosInstance;
    const value = Reflect.get(client, key);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
