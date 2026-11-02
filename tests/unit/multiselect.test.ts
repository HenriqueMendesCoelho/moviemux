import { afterEach, expect, test, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import Select from 'src/core/components/BaseMultiSelect.vue';
const wrappers: VueWrapper[] = [];
const options = [
  { value: 1, label: 'Ação' },
  { value: 2, label: 'Drama' },
  { value: 3, label: 'Ficção científica' },
];
function create(extra = {}) {
  const wrapper = mount(Select, {
    attachTo: document.body,
    props: { options, label: 'Gêneros', modelValue: [], ...extra },
  });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});
test('searches accents, selects multiple values without closing, and clears selections', async () => {
  const wrapper = create();
  await wrapper.get('.mm-multiselect-trigger').trigger('click');
  await flushPromises();
  expect(document.activeElement).toBe(wrapper.get('input').element);
  await wrapper.get('input').setValue('acao');
  expect(wrapper.findAll('[role=option]')).toHaveLength(1);
  await wrapper.get('[role=option]').trigger('click');
  expect(wrapper.emitted('change')?.at(-1)).toEqual([[1]]);
  await wrapper.setProps({ modelValue: [1] });
  await wrapper.get('input').setValue('');
  await wrapper.findAll('[role=option]')[1]!.trigger('click');
  expect(wrapper.emitted('change')?.at(-1)).toEqual([[1, 2]]);
  await wrapper.setProps({ modelValue: [1, 2] });
  expect(wrapper.get('.mm-multiselect-count').text()).toBe('2');
  expect(wrapper.get('[role=dialog]').exists()).toBe(true);
  const clear = wrapper.findAll('footer button').find((button) => button.text() === 'Limpar')!;
  await clear.trigger('click');
  expect(wrapper.emitted('change')?.at(-1)).toEqual([[]]);
});
test('supports arrow navigation, Escape restore and pointer outside dismissal', async () => {
  const wrapper = create();
  const trigger = wrapper.get('.mm-multiselect-trigger');
  await trigger.trigger('keydown', { key: 'ArrowDown' });
  await flushPromises();
  await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' });
  expect(document.activeElement).toBe(wrapper.findAll('[role=option]')[0]!.element);
  await wrapper.findAll('[role=option]')[0]!.trigger('keydown', { key: 'ArrowDown' });
  expect(document.activeElement).toBe(wrapper.findAll('[role=option]')[1]!.element);
  await wrapper.findAll('[role=option]')[1]!.trigger('keydown', { key: 'Escape' });
  await flushPromises();
  expect(trigger.attributes('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger.element);
  await trigger.trigger('click');
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await flushPromises();
  expect(trigger.attributes('aria-expanded')).toBe('false');
});
test('announces loading, errors with retry and no matches without native checkbox styling', async () => {
  const wrapper = create({ loading: true });
  await wrapper.get('.mm-multiselect-trigger').trigger('click');
  expect(wrapper.get('[role=status]').text()).toContain('Carregando');
  await wrapper.setProps({ loading: false, error: 'Serviço indisponível' });
  expect(wrapper.get('[role=alert]').text()).toContain('Serviço indisponível');
  await wrapper.get('.mm-multiselect-retry').trigger('click');
  expect(wrapper.emitted('retry')).toHaveLength(1);
  await wrapper.setProps({ error: '' });
  await wrapper.get('input').setValue('xyz');
  expect(wrapper.get('[role=status]').text()).toContain('Nenhum gênero encontrado');
  expect(wrapper.find('input[type=checkbox]').exists()).toBe(false);
});
test('disabled picker cannot open and each picker gets independent IDs', async () => {
  const disabled = create({ disabled: true });
  await disabled.get('.mm-multiselect-trigger').trigger('click');
  expect(disabled.find('[role=dialog]').exists()).toBe(false);
  const pair = mount({
    components: { Select },
    setup: () => ({ options }),
    template:
      '<div><Select :options="options" label="Primeiro" /><Select :options="options" label="Segundo" /></div>',
  });
  wrappers.push(pair);
  const controls = pair.findAllComponents(Select);
  await controls[0]!.get('.mm-multiselect-trigger').trigger('click');
  await controls[1]!.get('.mm-multiselect-trigger').trigger('click');
  expect(controls[0]!.get('section').attributes('id')).not.toBe(
    controls[1]!.get('section').attributes('id'),
  );
});

test('cached picker detaches outside listeners, closes and retains selection on reactivation', async () => {
  const added = vi.spyOn(document, 'addEventListener');
  const removed = vi.spyOn(document, 'removeEventListener');
  const wrapper = mount(
    {
      components: { Select },
      data: () => ({ visible: true, values: [1], options }),
      template:
        '<KeepAlive><Select v-if="visible" v-model="values" :options="options" label="Gêneros" /></KeepAlive>',
    },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  const select = wrapper.findComponent(Select);
  const listener = added.mock.calls.find(([type]) => type === 'pointerdown')?.[1];
  expect(listener).toBeDefined();
  expect(
    added.mock.calls.filter(([type, handler]) => type === 'pointerdown' && handler === listener),
  ).toHaveLength(1);
  await select.get('.mm-multiselect-trigger').trigger('click');
  expect(select.get('.mm-multiselect-trigger').attributes('aria-expanded')).toBe('true');
  await wrapper.setData({ visible: false });
  expect(
    removed.mock.calls.some(([type, handler]) => type === 'pointerdown' && handler === listener),
  ).toBe(true);
  await wrapper.setData({ visible: true });
  expect(
    added.mock.calls.filter(([type, handler]) => type === 'pointerdown' && handler === listener),
  ).toHaveLength(2);
  const restored = wrapper.findComponent(Select);
  expect(restored.get('.mm-multiselect-trigger').attributes('aria-expanded')).toBe('false');
  expect(restored.get('.mm-multiselect-value').text()).toBe('Ação');
  await restored.get('.mm-multiselect-trigger').trigger('click');
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await flushPromises();
  expect(restored.get('.mm-multiselect-trigger').attributes('aria-expanded')).toBe('false');
});

test('popover flips above a low trigger and clamps its scrollable height to the viewport', async () => {
  const wrapper = create();
  vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(20, window.innerHeight - 70, 250, 44),
  );
  await wrapper.get('.mm-multiselect-trigger').trigger('click');
  expect(wrapper.get('section').classes()).toContain('mm-multiselect-above');
  const height = Number.parseFloat((wrapper.get('section').element as HTMLElement).style.maxHeight);
  expect(height).toBeLessThanOrEqual(380);
  expect(height).toBeGreaterThan(0);
});
