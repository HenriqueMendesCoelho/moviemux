import { ref } from 'vue';
export { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, useId } from 'vue';
export { useRoute, useRouter } from 'vue-router';
export const useRuntimeConfig = () => ({
  public: {
    turnstileEnabled: false,
    turnstileSiteKey: 'test-sitekey',
    apiUrl: 'http://api.test',
    socketUrl: '',
    tmdbImageBase: 'https://images.test/t/p',
  },
});
export const useHead = () => undefined;
export const useCookie = () => ref<string | null>(null);
export const useNuxtApp = () => ({ $api: {}, $pwa: undefined });
export const navigateTo = (destination: unknown) => destination;
export const defineNuxtRouteMiddleware = <T>(handler: T) => handler;
export const defineNuxtPlugin = <T>(handler: T) => handler;
