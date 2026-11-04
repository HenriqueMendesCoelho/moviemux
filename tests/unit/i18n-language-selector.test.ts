import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import LanguageSelector from '../../src/core/i18n/LanguageSelector.vue';
import pt from '../../i18n/locales/pt-BR';
import en from '../../i18n/locales/en';

describe('language selector', () => {
  it('serializes rapid choices and leaves the last requested language active', async () => {
    const i18n = createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': pt, en } });
    let finish: (() => void) | undefined;
    const setLocale = vi.fn(async (value: 'pt-BR' | 'en') => {
      if (value === 'en')
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
      i18n.global.locale.value = value;
    });
    Object.assign(i18n.global, { setLocale });
    const wrapper = mount(LanguageSelector, { global: { plugins: [i18n] } });
    expect(wrapper.get('select').attributes('aria-label')).toBe('Idioma');
    await wrapper.get('select').setValue('en');
    await flushPromises();
    await wrapper.get('select').setValue('pt-BR');
    expect(setLocale).toHaveBeenCalledTimes(1);
    finish!();
    await flushPromises();
    expect(setLocale.mock.calls.map((call) => call[0])).toEqual(['en', 'pt-BR']);
    expect(i18n.global.locale.value).toBe('pt-BR');
    wrapper.unmount();
  });
});
