import { afterEach, expect, test, vi } from 'vitest';
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import BaseSelect from '../../src/core/components/BaseSelect.vue';

const options = [
  { value: 'popular', label: 'Populares' },
  { value: 'playingNow', label: 'Nos cinemas' },
  { value: 'topRated', label: 'Melhores avaliações' },
];
const wrappers: VueWrapper[] = [];
function setup() {
  const wrapper = mount(BaseSelect, {
    attachTo: document.body,
    props: { label: 'Mostrar', options, modelValue: 'popular' },
  });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});
test('themed listbox selects once and restores focus without native select', async () => {
  const wrapper = setup();
  const trigger = wrapper.get('[role=combobox]');
  expect(wrapper.find('select').exists()).toBe(false);
  await trigger.trigger('click');
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(wrapper.get('[aria-selected=true]').text()).toBe('Populares');
  await wrapper.findAll('[role=option]')[1]!.trigger('click');
  expect(wrapper.emitted('update:modelValue')).toEqual([['playingNow']]);
  expect(wrapper.emitted('change')).toEqual([['playingNow']]);
  expect(document.activeElement).toBe(trigger.element);
  expect(trigger.attributes('aria-expanded')).toBe('false');
  await wrapper.setProps({ modelValue: 'playingNow' });
  await trigger.trigger('click');
  await wrapper.get('[aria-selected=true]').trigger('click');
  expect(wrapper.emitted('change')).toHaveLength(1);
});
test('arrows, Home, End, typeahead and Escape navigate without committing a value', async () => {
  const wrapper = setup();
  const trigger = wrapper.get('[role=combobox]');
  await trigger.trigger('keydown', { key: 'ArrowDown' });
  const items = wrapper.findAll('[role=option]');
  expect(document.activeElement).toBe(items[0]!.element);
  await items[0]!.trigger('keydown', { key: 'End' });
  expect(document.activeElement).toBe(items[2]!.element);
  await items[2]!.trigger('keydown', { key: 'Home' });
  expect(document.activeElement).toBe(items[0]!.element);
  await items[0]!.trigger('keydown', { key: 'ArrowUp' });
  expect(document.activeElement).toBe(items[2]!.element);
  await items[2]!.trigger('keydown', { key: 'n' });
  expect(document.activeElement).toBe(items[1]!.element);
  await items[1]!.trigger('keydown', { key: 'Escape' });
  expect(document.activeElement).toBe(trigger.element);
  expect(wrapper.emitted('change')).toBeUndefined();
  expect(trigger.attributes('aria-expanded')).toBe('false');
});
test('outside pointer, Tab focus departure and disable close the popup', async () => {
  const wrapper = setup();
  const trigger = wrapper.get('[role=combobox]');
  await trigger.trigger('click');
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  await nextTick();
  expect(trigger.attributes('aria-expanded')).toBe('false');
  await trigger.trigger('click');
  await wrapper.get('[role=option]').trigger('focusout', { relatedTarget: document.body });
  expect(trigger.attributes('aria-expanded')).toBe('false');
  await trigger.trigger('click');
  await wrapper.setProps({ disabled: true });
  expect(trigger.attributes('aria-expanded')).toBe('false');
  expect(trigger.attributes('disabled')).toBeDefined();
});
test('popup flips and clamps to available viewport height', async () => {
  const wrapper = setup();
  vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
    top: 600,
    bottom: 650,
    left: 900,
    right: 1000,
    width: 100,
    height: 50,
    x: 900,
    y: 600,
    toJSON: () => ({}),
  });
  await wrapper.get('[role=combobox]').trigger('click');
  expect(wrapper.get('[role=listbox]').classes()).toContain('mm-select-above');
  expect(wrapper.get('[role=listbox]').classes()).toContain('mm-select-right');
  expect(wrapper.get('[role=listbox]').attributes('style')).toContain('max-height: 380px');
});
test('KeepAlive deactivation closes the menu but retains selected value on return', async () => {
  const visible = ref(true);
  const selected = ref('topRated');
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, {
        default: () =>
          visible.value
            ? h(BaseSelect, { label: 'Mostrar', options, modelValue: selected.value })
            : h('div'),
      }),
  });
  const wrapper = mount(Host);
  wrappers.push(wrapper);
  await wrapper.get('[role=combobox]').trigger('click');
  visible.value = false;
  await flushPromises();
  visible.value = true;
  await flushPromises();
  expect(wrapper.get('[role=combobox]').text()).toBe('Melhores avaliações');
  expect(wrapper.get('[role=combobox]').attributes('aria-expanded')).toBe('false');
});

test('does not inherit the global native input class on its composite root', () => {
  const wrapper = setup();
  expect(wrapper.classes()).toContain('mm-single-select');
  expect(wrapper.classes()).not.toContain('mm-select');
});
