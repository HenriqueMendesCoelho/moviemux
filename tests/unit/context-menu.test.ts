import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});
function setup() {
  const action = vi.fn();
  const wrapper = mount(
    defineComponent({
      components: { BaseContextMenu },
      setup: () => ({ action }),
      template:
        '<article><a href="/movie/test" class="poster">Pôster</a><BaseContextMenu title="Filme"><button disabled>Indisponível</button><button @click="action">Copiar link</button><a href="/movie/test" target="_blank">Abrir em nova guia</a></BaseContextMenu></article>',
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return { wrapper, action };
}
function panel() {
  return document.querySelector<HTMLElement>('[role="menu"]')!;
}
async function key(value: string) {
  panel().dispatchEvent(
    new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
  );
  await flushPromises();
}
describe('themed context menu keyboard and lifecycle', () => {
  it('uses a quiet touch trigger and moves focus among enabled actions', async () => {
    const { wrapper } = setup();
    await wrapper.get('.mm-context-trigger').trigger('click');
    await flushPromises();
    expect(panel().parentElement).toBe(document.body);
    expect(document.activeElement?.textContent).toBe('Copiar link');
    expect(panel().querySelector('button')?.getAttribute('role')).toBe('menuitem');
    await key('ArrowDown');
    expect(document.activeElement?.textContent).toBe('Abrir em nova guia');
    await key('ArrowDown');
    expect(document.activeElement?.textContent).toBe('Copiar link');
    await key('End');
    expect(document.activeElement?.textContent).toBe('Abrir em nova guia');
    await key('Home');
    expect(document.activeElement?.textContent).toBe('Copiar link');
    await key('a');
    expect(document.activeElement?.textContent).toBe('Abrir em nova guia');
    await key('Escape');
    expect(wrapper.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(wrapper.get('.mm-context-trigger').element);
  });
  it('supports Shift+F10 on the poster and restores that exact opener', async () => {
    const { wrapper } = setup();
    const poster = wrapper.get('.poster').element as HTMLElement;
    poster.focus();
    await wrapper.get('.poster').trigger('keydown', { key: 'F10', shiftKey: true });
    await flushPromises();
    expect(panel()).toBeTruthy();
    await key('Escape');
    expect(document.activeElement).toBe(poster);
  });
  it('only keeps one menu open and closes on outside pointer without stealing focus', async () => {
    const first = setup().wrapper;
    const second = setup().wrapper;
    await first.get('.mm-context-trigger').trigger('click');
    await second.get('.mm-context-trigger').trigger('click');
    await flushPromises();
    expect(first.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
    expect(second.get('.mm-context-trigger').attributes('aria-expanded')).toBe('true');
    const poster = first.get('.poster').element as HTMLElement;
    poster.focus();
    poster.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(second.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(poster);
  });
  it('Escape also closes a menu whose actions are all disabled', async () => {
    const wrapper = mount(BaseContextMenu, {
      attachTo: document.body,
      slots: { default: '<button disabled>Indisponível</button>' },
    });
    wrappers.push(wrapper);
    await wrapper.get('.mm-context-trigger').trigger('click');
    await flushPromises();
    await wrapper.get('.mm-context-trigger').trigger('keydown', { key: 'Escape' });
    expect(wrapper.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
  });
  it('selection runs once, closes the menu and cleans the portal on unmount', async () => {
    const { wrapper, action } = setup();
    await wrapper.get('.mm-context-trigger').trigger('click');
    await flushPromises();
    panel().querySelector<HTMLButtonElement>('button:not(:disabled)')!.click();
    await flushPromises();
    expect(action).toHaveBeenCalledTimes(1);
    expect(wrapper.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
    await wrapper.get('.mm-context-trigger').trigger('click');
    await flushPromises();
    wrapper.unmount();
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});
