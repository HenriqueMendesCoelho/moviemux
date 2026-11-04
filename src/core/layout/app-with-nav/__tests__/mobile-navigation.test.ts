import { createI18n } from 'vue-i18n';
import pt from '../../../../../i18n/locales/pt-BR';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive, createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import AppLayout from '../AppLayout.vue';

const state = vi.hoisted(() => ({
  style: { layoutSettings: { isSideBarExpanded: false, darkMode: true }, darkThemeToggle: vi.fn() },
  user: { user: { name: 'Henrique' }, isAdmin: false, showDialogLogin: false, logout: vi.fn() },
}));
vi.mock('~/core/stores/StyleStore', () => ({ useStyleStore: () => reactive(state.style) }));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => reactive(state.user) }));
vi.mock('~/modules/login/components/LoginDialog.vue', () => ({ default: { template: '<div />' } }));
const route = reactive({ fullPath: '/home' });
let mobile = true;
let viewportChanged: (() => void) | undefined;
const media = {
  get matches() {
    return mobile;
  },
  addEventListener: vi.fn((_event: string, handler: () => void) => {
    viewportChanged = handler;
  }),
  removeEventListener: vi.fn(),
};
beforeEach(() => {
  state.style.layoutSettings.isSideBarExpanded = false;
  state.user.showDialogLogin = false;
  route.fullPath = '/home';
  mobile = true;
  vi.stubGlobal('useRoute', () => route);
  vi.stubGlobal('useNuxtApp', () => ({ $pwa: {} }));
  vi.stubGlobal('navigateTo', vi.fn());
  window.matchMedia = vi.fn().mockReturnValue(media);
});
afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  vi.clearAllMocks();
});
function mountLayout() {
  return mount(AppLayout, {
    attachTo: document.body,
    slots: { default: '<button id="page-action">Ação da página</button>' },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a href="#"><slot /></a>' } } },
  });
}

describe('responsive sidebar keyboard access', () => {
  it('makes the closed mobile drawer inert and connects the toggle to it', async () => {
    const wrapper = mountLayout();
    await flushPromises();
    expect(wrapper.get('aside').attributes('inert')).toBeDefined();
    expect(wrapper.get('aside').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.mm-mobile-menu').attributes('aria-controls')).toBe(
      wrapper.get('aside').attributes('id'),
    );
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeUndefined();
    wrapper.unmount();
  });

  it('focuses the drawer, wraps Tab, and restores the toggle after Escape', async () => {
    const wrapper = mountLayout();
    await flushPromises();
    const toggle = wrapper.get('.mm-mobile-menu');
    (toggle.element as HTMLElement).focus();
    await toggle.trigger('click');
    await flushPromises();
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeDefined();
    expect(wrapper.get('aside').attributes('aria-modal')).toBe('true');
    const first = wrapper.get('[aria-label="Fechar menu de navegação"]');
    expect(document.activeElement).toBe(first.element);
    const last = wrapper.get('aside .mm-text-button');
    await first.trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last.element);
    await last.trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(first.element);
    await first.trigger('keydown', { key: 'Escape' });
    await flushPromises();
    expect(wrapper.get('aside').attributes('inert')).toBeDefined();
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeUndefined();
    expect(document.activeElement).toBe(toggle.element);
    expect(document.body.style.overflow).toBe('');
    wrapper.unmount();
  });

  it('dismisses on backdrop and route changes without leaving the workspace inert', async () => {
    const wrapper = mountLayout();
    await flushPromises();
    await wrapper.get('.mm-mobile-menu').trigger('click');
    await flushPromises();
    await wrapper.get('.mm-sidebar-backdrop').trigger('click');
    await flushPromises();
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeUndefined();
    await wrapper.get('.mm-mobile-menu').trigger('click');
    await flushPromises();
    route.fullPath = '/profile';
    await flushPromises();
    expect(wrapper.get('aside').attributes('inert')).toBeDefined();
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeUndefined();
    wrapper.unmount();
  });

  it('removes modal behavior on desktop and closes when session recovery starts', async () => {
    const wrapper = mountLayout();
    await flushPromises();
    await wrapper.get('.mm-mobile-menu').trigger('click');
    await flushPromises();
    mobile = false;
    viewportChanged?.();
    await flushPromises();
    expect(wrapper.get('aside').attributes('inert')).toBeUndefined();
    expect(wrapper.get('aside').attributes('aria-modal')).toBeUndefined();
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeUndefined();
    mobile = true;
    viewportChanged?.();
    await flushPromises();
    reactive(state.user).showDialogLogin = true;
    await flushPromises();
    expect(wrapper.get('aside').attributes('inert')).toBeDefined();
    expect(wrapper.get('.mm-workspace').attributes('inert')).toBeUndefined();
    wrapper.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('does not inspect matchMedia during server rendering', async () => {
    const app = createSSRApp(AppLayout);
    app.component('NuxtLink', { template: '<a href="#"><slot /></a>' });
    const html = await renderToString(app.use(createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': pt, en: pt } })));
    expect(html).toContain('primary-sidebar');
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});
