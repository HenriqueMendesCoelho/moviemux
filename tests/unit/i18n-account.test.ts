import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { nextTick } from 'vue';
import pt from '../../i18n/locales/pt-BR/account.json';
import en from '../../i18n/locales/en/account.json';
import PanelSecurityProfile from '../../src/modules/profile/components/PanelSecurityProfile.vue';
import AdministratorInviteUserTab from '../../src/modules/administrator/components/AdministratorInviteUserTab.vue';
import LoginCreateAccountTab from '../../src/modules/login/components/LoginCreateAccountTab.vue';
import LoginForgotPasswordTab from '../../src/modules/login/components/LoginForgotPasswordTab.vue';
import NecessaryCookieNotice from '../../src/modules/login/components/NecessaryCookieNotice.vue';

const services = vi.hoisted(() => ({
  create: vi.fn(),
  createRedefinePassowordKey: vi.fn(),
  listUserInvites: vi.fn(),
  updateUserPassword: vi.fn(),
}));
vi.mock('src/core/services/UserService', () => ({ default: services }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showSuccess: vi.fn() }));
const passwordInput = {
  props: ['label', 'modelValue'],
  emits: ['update:modelValue'],
  template: `<label>{{ label }}<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" /></label>`,
};
function i18n(locale = 'en') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'pt-BR',
    messages: { 'pt-BR': { account: pt }, en: { account: en } },
  });
}
afterEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('localized account interfaces', () => {
  it('updates existing validation errors and labels without losing password fields', async () => {
    const plugin = i18n();
    const wrapper = mount(PanelSecurityProfile, {
      global: { plugins: [plugin], stubs: { BasePasswordInput: passwordInput } },
    });
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('ExistingPass1!');
    await inputs[1]!.setValue('NewPass123!');
    await inputs[2]!.setValue('Mismatch123!');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toBe(en.confirmationMismatch);
    expect(services.updateUserPassword).not.toHaveBeenCalled();
    plugin.global.locale.value = 'pt-BR';
    await nextTick();
    expect(wrapper.get('[role="alert"]').text()).toBe(pt.confirmationMismatch);
    expect(wrapper.get('h2').text()).toBe(pt.changePassword);
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('NewPass123!');
    wrapper.unmount();
  });
  it('translates an existing load failure when switching language', async () => {
    services.listUserInvites.mockRejectedValue(new Error('private diagnostic'));
    const plugin = i18n();
    const wrapper = mount(AdministratorInviteUserTab, { global: { plugins: [plugin] } });
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe(en.invitesLoadFailed);
    expect(wrapper.text()).not.toContain('private diagnostic');
    plugin.global.locale.value = 'pt-BR';
    await nextTick();
    expect(wrapper.get('[role="alert"]').text()).toBe(pt.invitesLoadFailed);
    wrapper.unmount();
  });
  it('uses complete pluralized pagination messages and preserves invitation codes', async () => {
    services.listUserInvites.mockResolvedValue([{ code: 'convite-autoral' }]);
    const plugin = i18n();
    const wrapper = mount(AdministratorInviteUserTab, { global: { plugins: [plugin] } });
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe('Page 1 of 1 · 1 record');
    expect(wrapper.text()).toContain('convite-autoral');
    expect(plugin.global.t('account.pageSummary', { page: 1, pages: 1, count: 0 }, 0)).toBe(
      'Page 1 of 1 · 0 records',
    );
    wrapper.unmount();
  });
  it('translates cookie notice accessibility and keeps acknowledgement behavior', async () => {
    const wrapper = mount(NecessaryCookieNotice, { global: { plugins: [i18n()] } });
    expect(wrapper.get('aside').attributes('aria-label')).toBe('Necessary cookies');
    expect(wrapper.get('button').text()).toBe('Got it');
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(localStorage.getItem('moviemux:necessary-cookie-notice:v1')).toBe('acknowledged');
    wrapper.unmount();
  });
  it('keeps signup validation and entered details reactive across languages', async () => {
    const plugin = i18n();
    const wrapper = mount(LoginCreateAccountTab, {
      global: {
        plugins: [plugin],
        stubs: {
          BasePasswordInput: passwordInput,
          TurnstileChallenge: { template: '<div />', methods: { reset() {} } },
        },
      },
    });
    await wrapper.get('input[type="email"]').setValue('person@example.com');
    await wrapper.get('input[autocomplete="nickname"]').setValue('Nome original');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toBe(en.passwordRequirements);
    plugin.global.locale.value = 'pt-BR';
    await nextTick();
    expect(wrapper.get('[role="alert"]').text()).toBe(pt.passwordRequirements);
    expect((wrapper.get('input[autocomplete="nickname"]').element as HTMLInputElement).value).toBe(
      'Nome original',
    );
    expect(services.create).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('uses a safe translated recovery failure and preserves the API payload', async () => {
    services.createRedefinePassowordKey.mockRejectedValue(new Error('private backend message'));
    const wrapper = mount(LoginForgotPasswordTab, {
      global: {
        plugins: [i18n()],
        stubs: { TurnstileChallenge: { template: '<div />', methods: { reset() {} } } },
      },
    });
    await wrapper.get('input').setValue('person@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe(en.instructionsFailed);
    expect(wrapper.text()).not.toContain('private backend message');
    expect(services.createRedefinePassowordKey).toHaveBeenCalledWith('person@example.com', '');
    wrapper.unmount();
  });
  it('keeps both account catalogs complete', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
  });
});
