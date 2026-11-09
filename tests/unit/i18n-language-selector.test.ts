import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import LanguageSelector from '../../src/core/i18n/LanguageSelector.vue';
import pt from '../../i18n/locales/pt-BR';
import en from '../../i18n/locales/en';

function setup(delayed = false) {
  const i18n = createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': pt, en } });
  let finish: (() => void) | undefined;
  const setLocale = vi.fn(async (value: 'pt-BR' | 'en') => {
    if (delayed && value === 'en')
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    i18n.global.locale.value = value;
  });
  Object.assign(i18n.global, { setLocale });
  const wrapper = mount(LanguageSelector, { attachTo: document.body, global: { plugins: [i18n] } });
  return { wrapper, i18n, setLocale, finish: () => finish!() };
}

describe('language selector', () => {
  it('uses the shared themed listbox rather than a native select', async () => {
    const { wrapper, i18n } = setup();
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.get('.mm-select-label').text()).toBe('Idioma');
    const trigger = wrapper.get('[role="combobox"]');
    await trigger.trigger('click');
    expect(wrapper.get('[role="listbox"]').classes()).toContain('mm-select-panel');
    expect(wrapper.findAll('[role="option"]').map((item) => item.text())).toEqual([
      'Português (Brasil)',
      'English',
    ]);
    await wrapper.findAll('[role="option"]')[1]!.trigger('click');
    await flushPromises();
    expect(i18n.global.locale.value).toBe('en');
    expect(trigger.text()).toBe('English');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('.mm-select-label').text()).toBe('Language');
    expect(document.activeElement).toBe(trigger.element);
    i18n.global.locale.value = 'pt-BR';
    await flushPromises();
    expect(trigger.text()).toBe('Português (Brasil)');
    wrapper.unmount();
  });

  it('serializes rapid choices and leaves the last requested language active', async () => {
    const { wrapper, i18n, setLocale, finish } = setup(true);
    await wrapper.get('[role="combobox"]').trigger('click');
    await wrapper.findAll('[role="option"]')[1]!.trigger('click');
    await flushPromises();
    await wrapper.get('[role="combobox"]').trigger('click');
    await wrapper.findAll('[role="option"]')[0]!.trigger('click');
    expect(setLocale).toHaveBeenCalledTimes(1);
    finish();
    await flushPromises();
    expect(setLocale.mock.calls.map((call) => call[0])).toEqual(['en', 'pt-BR']);
    expect(i18n.global.locale.value).toBe('pt-BR');
    expect(wrapper.get('[role="combobox"]').text()).toBe('Português (Brasil)');
    wrapper.unmount();
  });

  it('supports keyboard navigation, Escape, outside dismissal and reopening', async () => {
    const { wrapper, setLocale } = setup();
    const trigger = wrapper.get('[role="combobox"]');
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    const options = wrapper.findAll('[role="option"]');
    expect(document.activeElement).toBe(options[0]!.element);
    await options[0]!.trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]!.element);
    await options[1]!.trigger('keydown', { key: 'Escape' });
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger.element);
    await trigger.trigger('click');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(trigger.attributes('aria-expanded')).toBe('false');
    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(setLocale).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
