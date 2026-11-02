import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import SpotlightCard from '../SpotlightCard.vue';
let eligible = true;
let changed: (() => void) | undefined;
const remove = vi.fn();
beforeEach(() => {
  eligible = true;
  changed = undefined;
  remove.mockClear();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return eligible;
    },
    addEventListener: (_name: string, handler: () => void) => {
      changed = handler;
    },
    removeEventListener: remove,
  }));
});
afterEach(() => {
  document.body.innerHTML = '';
});
const content = '<form><label>Nome<input name="name" /></label><button>Entrar</button></form>';
describe('vendored Vue Bits SpotlightCard enhancement', () => {
  it('renders complete visible content on the server without browser APIs', async () => {
    const app = createSSRApp({
      render: () => h(SpotlightCard, null, { default: () => h('button', 'Entrar') }),
    });
    const html = await renderToString(app);
    expect(html).toContain('<button>Entrar</button>');
    expect(html).toContain('aria-hidden="true"');
    expect(window.matchMedia).not.toHaveBeenCalled();
    expect(html).not.toContain('display:none');
  });
  it('keeps keyboard semantics and default layout unchanged', () => {
    const wrapper = mount(SpotlightCard, { slots: { default: content } });
    expect(wrapper.attributes('tabindex')).toBeUndefined();
    expect(wrapper.findAll('input,button')).toHaveLength(2);
    expect(wrapper.get('.vb-spotlight-overlay').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('opacity: 0');
    expect(wrapper.attributes('style')).toBeUndefined();
    wrapper.unmount();
  });
  it('uses the upstream radial-position effect only for eligible pointer hover', async () => {
    const wrapper = mount(SpotlightCard, { slots: { default: content } });
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 30,
    } as DOMRect);
    await wrapper.trigger('mouseenter');
    await wrapper.trigger('mousemove', { clientX: 100, clientY: 120 });
    const overlay = wrapper.get('.vb-spotlight-overlay');
    expect(overlay.attributes('style')).toContain('opacity: 0.6');
    expect(overlay.attributes('style')).toContain('circle at 80px 90px');
    await wrapper.trigger('mouseleave');
    expect(overlay.attributes('style')).toContain('opacity: 0');
    const before = overlay.attributes('style');
    await wrapper.trigger('mousemove', { clientX: 200, clientY: 250 });
    expect(overlay.attributes('style')).toBe(before);
    wrapper.unmount();
  });
  it('does not animate for coarse pointers or reduced-motion preferences', async () => {
    eligible = false;
    const wrapper = mount(SpotlightCard, { slots: { default: content } });
    expect(window.matchMedia).toHaveBeenCalledWith(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    await wrapper.trigger('mouseenter');
    await wrapper.trigger('mousemove', { clientX: 30, clientY: 50 });
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('opacity: 0');
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('circle at 0px 0px');
    wrapper.unmount();
  });
  it('suppresses the highlight while a form field has focus', async () => {
    const wrapper = mount(SpotlightCard, { slots: { default: content }, attachTo: document.body });
    await wrapper.trigger('mouseenter');
    await wrapper.get('input').trigger('focusin');
    await wrapper.trigger('mousemove', { clientX: 30, clientY: 50 });
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('opacity: 0');
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('circle at 0px 0px');
    wrapper.unmount();
  });
  it('resets on preference/document-visibility changes and removes listeners', async () => {
    const removed = vi.spyOn(document, 'removeEventListener');
    const wrapper = mount(SpotlightCard, { slots: { default: content } });
    await wrapper.trigger('mouseenter');
    eligible = false;
    changed?.();
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('opacity: 0');
    eligible = true;
    changed?.();
    await wrapper.trigger('mouseenter');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.vb-spotlight-overlay').attributes('style')).toContain('opacity: 0');
    wrapper.unmount();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
