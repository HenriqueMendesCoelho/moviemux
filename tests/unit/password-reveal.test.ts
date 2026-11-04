import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('integrated password visibility', () => {
  it('uses one stable native input and a named decorative icon button without changing its value', async () => {
    const wrapper = mount(BasePasswordInput, {
      props: { modelValue: 'fictional fixture', label: 'Senha atual', id: 'current-password' },
      attrs: { autocomplete: 'current-password', name: 'password', class: 'grid-column' },
    });
    const input = wrapper.get('input');
    const originalInput = input.element;
    const toggle = wrapper.get('button');
    const hiddenPath = toggle.get('path').attributes('d');
    expect(input.attributes()).toMatchObject({
      id: 'current-password',
      type: 'password',
      name: 'password',
      autocomplete: 'current-password',
    });
    expect(wrapper.classes()).toContain('grid-column');
    expect(input.classes()).not.toContain('grid-column');
    expect(wrapper.get('label').attributes('for')).toBe('current-password');
    expect(wrapper.get('label').find('button').exists()).toBe(false);
    expect(toggle.attributes()).toMatchObject({
      type: 'button',
      'aria-label': 'Mostrar senha',
      'aria-pressed': 'false',
      'aria-controls': 'current-password',
    });
    expect(toggle.text()).toBe('');
    expect(toggle.get('svg').attributes()).toMatchObject({
      'aria-hidden': 'true',
      focusable: 'false',
    });

    await toggle.trigger('click');
    expect(wrapper.get('input').element).toBe(originalInput);
    expect(input.attributes('type')).toBe('text');
    expect(input.element.value).toBe('fictional fixture');
    expect(toggle.attributes('aria-label')).toBe('Ocultar senha');
    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(toggle.get('path').attributes('d')).not.toBe(hiddenPath);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await toggle.trigger('click');
    expect(input.attributes('type')).toBe('password');
    expect(input.attributes('autocomplete')).toBe('current-password');
    expect(toggle.get('path').attributes('d')).toBe(hiddenPath);
    wrapper.unmount();
  });

  it('preserves new-password constraints and external descriptions while adding validation errors', async () => {
    const wrapper = mount(BasePasswordInput, {
      props: { modelValue: '', required: true },
      attrs: {
        autocomplete: 'new-password',
        minlength: '8',
        maxlength: '70',
        'aria-describedby': 'password-help',
      },
    });
    const input = wrapper.get('input');
    expect(input.attributes()).toMatchObject({
      autocomplete: 'new-password',
      minlength: '8',
      maxlength: '70',
      required: '',
      'aria-describedby': 'password-help',
    });
    expect(await wrapper.vm.hasErrors()).toBe(true);
    await flushPromises();
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.attributes('aria-describedby')).toBe(
      `password-help ${wrapper.get('[role="alert"]').attributes('id')}`,
    );
    await wrapper.vm.resetValidation();
    await nextTick();
    expect(input.attributes('aria-describedby')).toBe('password-help');
    wrapper.unmount();
  });

  it('keeps ordinary input updates available while toggling never submits the native form', async () => {
    const submitted = vi.fn();
    const wrapper = mount(
      defineComponent({
        components: { BasePasswordInput },
        setup: () => ({ submitted }),
        template: '<form @submit.prevent="submitted"><BasePasswordInput model-value="" /></form>',
      }),
      { attachTo: document.body },
    );
    const field = wrapper.getComponent(BasePasswordInput);
    await field.get('input').setValue('synthetic input');
    expect(field.emitted('update:modelValue')).toEqual([['synthetic input']]);
    field.get('button').element.click();
    await nextTick();
    expect(submitted).not.toHaveBeenCalled();
    expect(field.get('input').attributes('type')).toBe('text');
    wrapper.unmount();
  });

  it('keeps visibility when focus moves within the control and masks when it leaves', async () => {
    const wrapper = mount(BasePasswordInput, {
      props: { modelValue: '' },
      attachTo: document.body,
    });
    const input = wrapper.get('input');
    const toggle = wrapper.get('button');
    await toggle.trigger('click');
    await input.trigger('focusout', { relatedTarget: toggle.element });
    expect(input.attributes('type')).toBe('text');
    await toggle.trigger('focusout', { relatedTarget: input.element });
    expect(input.attributes('type')).toBe('text');
    await toggle.trigger('focusout', { relatedTarget: document.body });
    expect(input.attributes('type')).toBe('password');
    expect(toggle.attributes('aria-pressed')).toBe('false');
    wrapper.unmount();
  });

  it('masks after clearing and validation reset without emitting a value change', async () => {
    const wrapper = mount(BasePasswordInput, { props: { modelValue: 'fictional fixture' } });
    await wrapper.get('button').trigger('click');
    await wrapper.setProps({ modelValue: '' });
    expect(wrapper.get('input').attributes('type')).toBe('password');
    await wrapper.get('button').trigger('click');
    await wrapper.vm.resetValidation();
    await nextTick();
    expect(wrapper.get('input').attributes('type')).toBe('password');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });

  it('masks after a native form reset, including empty fields', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BasePasswordInput },
        template: '<form><BasePasswordInput model-value="" /></form>',
      }),
      { attachTo: document.body },
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('input').attributes('type')).toBe('text');
    wrapper.get('form').element.reset();
    await nextTick();
    expect(wrapper.get('input').attributes('type')).toBe('password');
    wrapper.unmount();
  });

  it('disables the reveal action and remasks a field when disabled', async () => {
    const wrapper = mount(BasePasswordInput, { props: { modelValue: '' } });
    await wrapper.get('button').trigger('click');
    await wrapper.setProps({ disabled: true });
    expect(wrapper.get('input').attributes('type')).toBe('password');
    expect(wrapper.get('input').element.disabled).toBe(true);
    expect(wrapper.get('button').element.disabled).toBe(true);
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('input').attributes('type')).toBe('password');
    wrapper.unmount();
  });

  it('gives independent fields distinct label associations and resets after remount', async () => {
    const host = mount(
      defineComponent({
        components: { BasePasswordInput },
        template:
          '<div><BasePasswordInput model-value="" /><BasePasswordInput model-value="" /></div>',
      }),
    );
    const [first, second] = host.findAllComponents(BasePasswordInput);
    expect(first!.get('input').attributes('id')).not.toBe(second!.get('input').attributes('id'));
    for (const field of [first!, second!]) {
      expect(field.get('label').attributes('for')).toBe(field.get('input').attributes('id'));
    }
    await first!.get('button').trigger('click');
    expect(second!.get('input').attributes('type')).toBe('password');
    host.unmount();
    const remounted = mount(BasePasswordInput, { props: { modelValue: '' } });
    expect(remounted.get('input').attributes('type')).toBe('password');
    remounted.unmount();
  });
});
