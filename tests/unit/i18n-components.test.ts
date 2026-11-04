import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import pt from '../../i18n/locales/pt-BR/components.json';
import en from '../../i18n/locales/en/components.json';
import BasePasswordInput from '../../src/core/components/BasePasswordInput.vue';
import BaseTextInput from '../../src/core/components/BaseTextInput.vue';
import BaseSelect from '../../src/core/components/BaseSelect.vue';
import BaseMultiSelect from '../../src/core/components/BaseMultiSelect.vue';
import BaseConfirmDialog from '../../src/core/components/BaseConfirmDialog.vue';
import BaseChipNote from '../../src/core/components/BaseChipNote.vue';
import Movie from '../../src/core/domain/movie/movie';

function plugin() {
  return createI18n({
    legacy: false,
    locale: 'pt-BR',
    fallbackLocale: 'pt-BR',
    messages: { 'pt-BR': { components: pt }, en: { components: en } },
  });
}
describe('shared localized controls', () => {
  it('has matching catalogs and formats every message without compiler errors', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
    const i18n = plugin();
    for (const locale of ['pt-BR', 'en']) {
      i18n.global.locale.value = locale;
      for (const key of Object.keys(pt)) {
        expect(
          i18n.global.t(`components.${key}`, {
            count: 2,
            name: 'Ana',
            title: 'Film',
            label: 'Field',
            rating: '8',
          }),
        ).not.toContain('components.');
      }
    }
  });
  it('switches password label, reveal action and existing validation without clearing the input', async () => {
    const i18n = plugin();
    const wrapper = mount(BasePasswordInput, {
      props: { modelValue: '', required: true },
      global: { plugins: [i18n] },
    });
    await wrapper.find('input').trigger('blur');
    expect(wrapper.text()).toContain('Obrigatório');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('Password');
    expect(wrapper.text()).toContain('Required');
    expect(wrapper.find('button').attributes('aria-label')).toBe('Show password');
    await wrapper.setProps({ modelValue: 'Secret123!' });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('input').attributes('type')).toBe('text');
    i18n.global.locale.value = 'pt-BR';
    await nextTick();
    expect(wrapper.find('input').element.value).toBe('Secret123!');
    expect(wrapper.find('button').attributes('aria-label')).toBe('Ocultar senha');
    wrapper.unmount();
  });
  it('switches required field errors already displayed', async () => {
    const i18n = plugin();
    const wrapper = mount(BaseTextInput, {
      props: { modelValue: '', required: true },
      global: { plugins: [i18n] },
    });
    await wrapper.find('input').trigger('blur');
    expect(wrapper.text()).toContain('Obrigatório');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('Required');
    wrapper.unmount();
  });
  it('switches select and multiselect fallbacks while retaining selection', async () => {
    const i18n = plugin();
    const single = mount(BaseSelect, {
      props: { label: 'Genre', options: [] },
      global: { plugins: [i18n] },
    });
    const multiple = mount(BaseMultiSelect, {
      props: { label: 'Genre', options: [{ value: 1, label: 'Drama' }], modelValue: [] },
      global: { plugins: [i18n] },
    });
    expect(single.text()).toContain('Selecionar');
    expect(multiple.text()).toContain('Todos os gêneros');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(single.text()).toContain('Select');
    expect(multiple.text()).toContain('All genres');
    await multiple.setProps({ modelValue: [1] });
    expect(multiple.text()).toContain('Drama');
    single.unmount();
    multiple.unmount();
  });
  it('keeps a confirmation open and reevaluates getter text after switching', async () => {
    const i18n = plugin();
    const wrapper = mount(BaseConfirmDialog, {
      global: {
        plugins: [i18n],
        stubs: {
          BaseModal: {
            props: ['modelValue', 'title'],
            template: '<section v-if="modelValue"><h1>{{ title }}</h1><slot /></section>',
          },
        },
      },
    });
    await wrapper.vm.show({ message: () => i18n.global.t('components.delete') });
    expect(wrapper.text()).toContain('Excluir');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('Delete');
    expect(wrapper.text()).toContain('Please confirm');
    expect(wrapper.text()).toContain('Cancel');
    wrapper.unmount();
  });
  it('formats the rating and accessible name by locale', async () => {
    const i18n = plugin();
    const movie = new Movie();
    movie.notes = [{ note: 8.5 }] as Movie['notes'];
    const wrapper = mount(BaseChipNote, { props: { movie }, global: { plugins: [i18n] } });
    expect(wrapper.text()).toContain('8,5');
    i18n.global.locale.value = 'en';
    await nextTick();
    expect(wrapper.text()).toContain('8.5');
    expect(wrapper.attributes('aria-label')).toBe('Average rating 8.5');
    wrapper.unmount();
  });
});
