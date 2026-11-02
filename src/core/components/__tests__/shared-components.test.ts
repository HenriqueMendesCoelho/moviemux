import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import BaseModal from '../BaseModal.vue';
import BaseContextMenu from '../BaseContextMenu.vue';
import BaseCardImage from '../BaseCardImage.vue';
import BaseTextInput from '../BaseTextInput.vue';
import BasePasswordInput from '../BasePasswordInput.vue';
import BaseSearchToolbar from '../BaseSearchToolbar.vue';
import BaseTableCopyDelete from '../BaseTableCopyDelete.vue';
import BaseMovieWatchProviders from '../BaseMovieWatchProviders.vue';

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://images.example.test/t/p' } }),
}));
const services = vi.hoisted(() => ({ providers: vi.fn() }));
vi.mock('src/core/services/KitService', () => ({
  default: { getWatchProviders: services.providers },
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('shared interaction contracts', () => {
  it('names dialogs and returns focus to the opener on dismissal', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Detalhes do filme' },
      slots: { default: '<button>Conteúdo</button>' },
    });
    await flushPromises();
    const dialog = wrapper.get('dialog');
    expect(dialog.attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'));
    await wrapper.get('[aria-label="Fechar diálogo"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
  });

  it('keeps input layout classes on wrapper and clears only editable fields', async () => {
    const wrapper = mount(BaseTextInput, {
      props: { modelValue: 'Henrique', label: 'Nome' },
      attrs: { class: 'grid-column' },
    });
    expect(wrapper.classes()).toContain('grid-column');
    expect(wrapper.get('input').classes()).not.toContain('grid-column');
    await wrapper.get('[aria-label="Limpar Nome"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    await wrapper.setProps({ readonly: true } as Parameters<typeof wrapper.setProps>[0]);
    expect(wrapper.find('[aria-label="Limpar Nome"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps password invalid when error text is suppressed', async () => {
    const wrapper = mount(BasePasswordInput, {
      props: { modelValue: '', required: true, errorTextRequired: false },
    });
    expect(await wrapper.vm.hasErrors()).toBe(true);
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    await wrapper.setProps({
      modelValue: 'short',
      required: false,
      validPassword: true,
      errorTextValidPassord: false,
    });
    expect(await wrapper.vm.hasErrors()).toBe(true);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    await wrapper.vm.resetValidation();
    await flushPromises();
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('false');
    wrapper.unmount();
  });

  it('refreshes results after search is cleared and gives each search a unique id', async () => {
    const host = mount(
      defineComponent({
        components: { BaseSearchToolbar },
        template:
          '<div><BaseSearchToolbar input-search="Alien"/><BaseSearchToolbar input-search=""/></div>',
      }),
    );
    const [first, second] = host.findAllComponents(BaseSearchToolbar);
    expect(first!.get('input').attributes('id')).not.toBe(second!.get('input').attributes('id'));
    await first!.get('input').setValue('');
    await flushPromises();
    expect(first!.emitted('update:inputSearch')?.at(-1)).toEqual(['']);
    expect(first!.emitted('search')).toHaveLength(1);
    host.unmount();
  });

  it('sorts numeric values ascending/descending without changing caller rows', async () => {
    const rows = [{ score: 10 }, { score: 2 }];
    const wrapper = mount(BaseTableCopyDelete, {
      props: {
        title: 'Notas',
        rows,
        columns: [{ name: 'score', label: 'Nota', field: 'score', sortable: true }],
      },
    });
    await wrapper.get('th button').trigger('click');
    expect(wrapper.findAll('tbody td').map((cell) => cell.text())).toEqual(['2', '10']);
    expect(wrapper.get('th').attributes('aria-sort')).toBe('ascending');
    await wrapper.get('th button').trigger('click');
    expect(wrapper.findAll('tbody td').map((cell) => cell.text())).toEqual(['10', '2']);
    expect(rows.map((row) => row.score)).toEqual([10, 2]);
    wrapper.unmount();
  });

  it('does not retain the provider spinner when the movie id clears mid-request', async () => {
    let finish!: (value: unknown) => void;
    services.providers.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const wrapper = mount(BaseMovieWatchProviders, { props: { tmdbId: 42 } });
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    await wrapper.setProps({ tmdbId: undefined });
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    finish({
      results: {
        BR: {
          link: 'https://example.test',
          flatrate: [{ provider_name: 'Stale provider', provider_id: 1, logo_path: '/x.png' }],
        },
      },
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain('Stale provider');
    wrapper.unmount();
  });
  it('opens card actions with right-click and clamps the menu inside the viewport', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BaseContextMenu, BaseCardImage },
        template:
          '<article><BaseCardImage src="/poster.png"/><BaseContextMenu><button>Abrir filme</button></BaseContextMenu></article>',
      }),
      { attachTo: document.body },
    );
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth - 1,
      clientY: window.innerHeight - 1,
    });
    wrapper.get('.mm-poster').element.dispatchEvent(event);
    await flushPromises();
    expect(event.defaultPrevented).toBe(true);
    const panel = document.querySelector<HTMLElement>('.mm-context-options')!;
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 190 });
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 100 });
    window.dispatchEvent(new Event('resize'));
    await flushPromises();
    expect(wrapper.get('.mm-context-trigger').attributes('aria-expanded')).toBe('true');
    expect(parseFloat(panel.style.left)).toBe(window.innerWidth - 190 - 8);
    expect(parseFloat(panel.style.top)).toBe(window.innerHeight - 100 - 8);
    expect(document.activeElement).toBe(panel.querySelector('button'));
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    expect(wrapper.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(wrapper.get('.mm-context-trigger').element);
    wrapper.unmount();
  });

  it('keeps persistent confirmation dialogs open on Escape', async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Confirme', persistent: true },
    });
    await flushPromises();
    const event = new Event('cancel', { cancelable: true });
    wrapper.get('dialog').element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });
  it('closes context menus even when an action stops click propagation', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BaseContextMenu },
        template:
          '<article><BaseContextMenu><button @click.stop>Copiar lista</button></BaseContextMenu></article>',
      }),
      { attachTo: document.body },
    );
    await wrapper.get('.mm-context-trigger').trigger('click');
    await flushPromises();
    document.querySelector<HTMLButtonElement>('.mm-context-options button')!.click();
    await flushPromises();
    expect(wrapper.get('.mm-context-trigger').attributes('aria-expanded')).toBe('false');
    wrapper.unmount();
  });
});
