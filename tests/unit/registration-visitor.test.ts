import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { AxiosError } from 'axios';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
import LoginForm from '../../src/modules/login/components/LoginForm.vue';
import LoginCreateAccountTab from '../../src/modules/login/components/LoginCreateAccountTab.vue';
const api = vi.hoisted(() => ({
  mode: vi.fn(),
  waitlist: vi.fn(),
  create: vi.fn(),
  login: vi.fn(),
}));
vi.mock('~/modules/login/services/RegistrationService', () => ({ default: api }));
vi.mock('src/core/services/UserService', () => ({ default: api }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => api }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showSuccess: vi.fn() }));
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRoute: () => ({ name: 'login', path: '/', query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));
function plugin(locale: string) {
  return createI18n({ legacy: false, locale, messages: { 'pt-BR': pt, en } });
}
let wrapper: VueWrapper | undefined;
function render(locale: string, registration = true) {
  wrapper = mount(LoginForm, {
    props: { createAccount: registration },
    global: {
      plugins: [plugin(locale)],
      stubs: {
        TurnstileChallenge: {
          props: ['action'],
          template: '<span :data-action="action" />',
          methods: { reset() {} },
        },
      },
    },
  });
  return wrapper;
}
function button(label: string) {
  const match = wrapper?.findAll('button').find((item) => item.text() === label);
  if (!match) throw new Error('Missing button ' + label);
  return match;
}
async function open(label: string) {
  await button(label).trigger('click');
  await flushPromises();
}
async function fillSignup() {
  await wrapper!.get('input[type="email"]').setValue('fictional@example.invalid');
  await wrapper!.get('input[autocomplete="nickname"]').setValue('Fixture');
  const passwords = wrapper!.findAll('input[autocomplete="new-password"]');
  await passwords[0]!.setValue('Strong123!');
  await passwords[1]!.setValue('Strong123!');
}
function error(status: number, code: string) {
  return new AxiosError('failure', undefined, undefined, undefined, {
    status,
    data: { data: { code } },
  } as never);
}
beforeEach(() => {
  vi.resetAllMocks();
  api.mode.mockResolvedValue('INVITE_ONLY');
  api.waitlist.mockResolvedValue(undefined);
  api.create.mockResolvedValue({});
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});
it.each(['pt-BR', 'en'])(
  'OPEN direct signup and WAITLIST join are explicit, localized (%s)',
  async (locale) => {
    const words = (locale === 'en' ? en : pt).account;
    api.mode.mockResolvedValue('OPEN');
    const view = render(locale);
    await flushPromises();
    expect(view.text()).toContain(words.noAccountYet);
    expect(view.text()).not.toContain(words.joinRegistrationWaitlist);
    await open(words.createMyAccount);
    expect(view.text()).toContain(words.openSignupIntro);
    expect(view.get('input[autocomplete="off"]').attributes('required')).toBeUndefined();
    await fillSignup();
    await view.get('form').trigger('submit');
    await flushPromises();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0]?.[0]).toEqual({
      name: 'Fixture',
      email: 'fictional@example.invalid',
      password: 'Strong123!',
      'cf-turnstile-response': '',
    });
    expect(view.text()).toContain(words.signIn);
    api.mode.mockResolvedValue('WAITLIST');
    view.unmount();
    const wait = render(locale);
    await flushPromises();
    expect(wait.text()).toContain(words.receivedInvite);
    await open(words.joinRegistrationWaitlist);
    expect(wait.text()).toContain(words.registrationWaitlistIntro);
    expect(wait.get('[data-action]').attributes('data-action')).toBe('registration_waitlist');
    expect(wait.findAll('input')).toHaveLength(1);
    await wait.get('input[type="email"]').setValue('wait@example.invalid');
    await wait.get('form').trigger('submit');
    await flushPromises();
    expect(api.waitlist).toHaveBeenCalledExactlyOnceWith('wait@example.invalid', '');
    expect(wait.get('[role="status"]').text()).toBe(words.registrationWaitlistAccepted);
    expect(api.create).toHaveBeenCalledTimes(1);
  },
);
it('keeps invitation completion reachable in WAITLIST and refreshes stale OPEN denial without silent fallback', async () => {
  api.mode.mockResolvedValue('OPEN');
  const view = render('en');
  await flushPromises();
  await open(en.account.createMyAccount);
  await fillSignup();
  api.create.mockRejectedValueOnce(error(400, 'registration.invite_required'));
  api.mode.mockResolvedValue('WAITLIST');
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(view.get('[role="alert"]').text()).toBe(en.account.registrationModeChanged);
  expect(view.get('input[autocomplete="off"]').attributes('required')).toBeDefined();
  expect((view.get('input[type="email"]').element as HTMLInputElement).value).toBe(
    'fictional@example.invalid',
  );
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(api.create).toHaveBeenCalledTimes(1);
  await view.get('input[autocomplete="off"]').setValue('fictional-code');
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(api.create.mock.calls[1]?.[0].invite_code).toBe('fictional-code');
});
it('fails conservatively on lookup error, but permits existing invitations; expired-session form does not read registration', async () => {
  api.mode.mockRejectedValue(new Error('offline'));
  const view = render('en');
  await flushPromises();
  expect(view.text()).toContain(en.account.registrationModeUnavailable);
  expect(view.text()).not.toContain(en.account.joinRegistrationWaitlist);
  await open(en.account.createMyAccount);
  expect(view.findComponent(LoginCreateAccountTab).exists()).toBe(true);
  expect(view.get('input[autocomplete="off"]').attributes('required')).toBeDefined();
  view.unmount();
  api.mode.mockClear();
  const reauth = render('en', false);
  await flushPromises();
  expect(api.mode).not.toHaveBeenCalled();
  expect(reauth.text()).not.toContain(en.account.createMyAccount);
});
it('refreshes stale waitlist denial without an automatic retry or signup', async () => {
  api.mode.mockResolvedValue('WAITLIST');
  const view = render('en');
  await flushPromises();
  await open(en.account.joinRegistrationWaitlist);
  await view.get('input[type="email"]').setValue('wait@example.invalid');
  api.waitlist.mockRejectedValueOnce(error(409, 'registration.mode_changed'));
  api.mode.mockResolvedValue('OPEN');
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(view.get('[role="alert"]').text()).toBe(en.account.registrationModeChanged);
  expect(view.find('input[type="email"]').exists()).toBe(false);
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(api.waitlist).toHaveBeenCalledTimes(1);
  expect(api.create).not.toHaveBeenCalled();
});

it('reports an explicitly provided invalid invite as invalid, even when refreshing policy', async () => {
  api.mode.mockResolvedValue('INVITE_ONLY');
  const view = render('en');
  await flushPromises();
  await open(en.account.createMyAccount);
  await fillSignup();
  await view.get('input[autocomplete="off"]').setValue('invalid-fixture-only');
  api.create.mockRejectedValueOnce(error(400, 'registration.invite_required'));
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(view.get('[role="alert"]').text()).toBe(en.account.invalidInvite);
  expect(api.create).toHaveBeenCalledTimes(1);
  expect((view.get('input[autocomplete="off"]').element as HTMLInputElement).value).toBe(
    'invalid-fixture-only',
  );
  expect(api.mode).toHaveBeenCalledTimes(3);
});
