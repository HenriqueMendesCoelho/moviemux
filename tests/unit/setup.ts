import { vi } from 'vitest';
import { config } from '@vue/test-utils';
import { useRuntimeConfig, useHead } from './nuxt-stubs';
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig);
vi.stubGlobal('useHead', useHead);
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
