import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BaseFloatingActionBtn from '../../src/core/components/BaseFloatingActionBtn.vue';
import BaseConfirmDialog from '../../src/core/components/BaseConfirmDialog.vue';

beforeEach(() => {
  setActivePinia(createPinia());
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true });
});
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('quiet, safe shared actions', () => {
  it('does not float over initial content and removes its scroll listener on disposal', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const wrapper = mount(BaseFloatingActionBtn);
    expect(wrapper.find('aside').exists()).toBe(false);
    Object.defineProperty(window, 'scrollY', { value: 850, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(wrapper.get('button').attributes('aria-label')).toBe('Voltar ao topo');
    expect(wrapper.get('button').classes()).not.toContain('mm-button-primary');
    await wrapper.get('button').trigger('click');
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    wrapper.unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
  it('does not animate scroll when reduced motion is requested', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { value: 850, configurable: true });
    const wrapper = mount(BaseFloatingActionBtn);
    await flushPromises();
    await wrapper.get('button').trigger('click');
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    wrapper.unmount();
  });
  it('defaults confirmation focus to Cancel rather than accepting a destructive action', async () => {
    const wrapper = mount(BaseConfirmDialog, { attachTo: document.body });
    await wrapper.vm.show({ title: 'Excluir lista?', message: 'Excluir Minha lista?', ok: 'Excluir' });
    await flushPromises();
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar');
    expect(wrapper.emitted('ok')).toBeUndefined();
    wrapper.unmount();
  });
});
