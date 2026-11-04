import { ref } from 'vue';
import { createI18n } from 'vue-i18n';
import pt from '../../i18n/locales/pt-BR';
import en from '../../i18n/locales/en';
import { beforeEach, vi } from 'vitest';
import { config } from '@vue/test-utils';
import { useRuntimeConfig, useHead } from './nuxt-stubs';
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig);
vi.stubGlobal('useHead', useHead);
beforeEach(() => {
  config.global.plugins = [
    createI18n({
      legacy: false,
      locale: 'pt-BR',
      fallbackLocale: 'pt-BR',
      messages: { 'pt-BR': pt, en },
      missingWarn: false,
      fallbackWarn: false,
    }),
  ];
});
config.global.stubs = {
  NuxtLink: { template: '<a><slot /></a>' },
  ClientOnly: { template: '<div><slot /></div>' },
};
if (!HTMLDialogElement.prototype.showModal)
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
if (!HTMLDialogElement.prototype.close)
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
if (!window.matchMedia)
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
// Per-mount preferences are exercised with real cookie/SSR transport in smoke tests.
vi.stubGlobal('useCookie', () => ref(undefined));
