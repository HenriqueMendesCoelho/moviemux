import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { reactive } from 'vue';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/registration-admin.json';
import pt from '../../i18n/locales/pt-BR/registration-admin.json';

const fixture = vi.hoisted(() => ({
  adminMode: vi.fn(),
  setAdminMode: vi.fn(),
  adminWaitlist: vi.fn(),
  inviteWaitlist: vi.fn(),
  store: null as null | {
    isAdmin: boolean;
    user: { id: string; generation: string; isLoged: boolean };
  },
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => fixture.store }));
vi.mock('../../src/modules/administrator/services/AdminRegistrationService', async (original) => ({
  ...(await original<object>()),
  default: fixture,
}));
import Tab from '../../src/modules/administrator/components/AdministratorRegistrationTab.vue';
import { AdminRegistrationError } from '../../src/modules/administrator/services/AdminRegistrationService';
const id = '10000000-0000-4000-8000-000000000001';
const otherId = '10000000-0000-4000-8000-000000000002';
const row = {
  request_id: id,
  email: 'pending@example.invalid',
  requested_at: '2026-11-26T01:00:00Z',
  status: 'PENDING',
};
let view: VueWrapper | undefined;
const stubs = {
  BaseConfirmDialog: {
    data: () => ({ options: null as null | { message: () => string } }),
    methods: {
      show(value: { message: () => string }) {
        this.options = value;
      },
    },
    template:
      '<div v-if="options"><p>{{ options.message() }}</p><button type="button" @click="options=null; $emit(\'ok\')">confirm-test</button><button type="button" @click="options=null; $emit(\'cancel\')">cancel-test</button></div>',
  },
  BaseSelect: {
    props: ['modelValue', 'label', 'options'],
    template:
      '<div><label>{{label}}<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in options" :value="item.value">{{item.label}}</option></select></label></div>',
  },
};
function render(locale = 'en') {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { en: { registrationAdmin: en }, 'pt-BR': { registrationAdmin: pt } },
  });
  view = mount(Tab, { global: { plugins: [i18n], stubs } });
  return view;
}
async function click(label: string) {
  const button = view!.findAll('button').find((item) => item.text() === label);
  if (!button) throw new Error('Missing test button: ' + label);
  await button.trigger('click');
  await flushPromises();
}
function hasCode() {
  return view!.findAll('input').some((input) => input.element.value === 'KB-12345678');
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.store = reactive({
    isAdmin: true,
    user: { id: 'fixture-admin', generation: 'initial', isLoged: true },
  });
  fixture.adminMode.mockResolvedValue('WAITLIST');
  fixture.adminWaitlist.mockResolvedValue({ items: [row], next_cursor: null });
  fixture.setAdminMode.mockResolvedValue('OPEN');
  fixture.inviteWaitlist.mockResolvedValue({
    request_id: id,
    status: 'DELIVERY_UNKNOWN',
    invite_code: 'KB-12345678',
  });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
});

test('nonadmin and failed fresh proof show no mode or roster and make no mutation', async () => {
  fixture.store!.isAdmin = false;
  render();
  await flushPromises();
  expect(fixture.adminMode).not.toHaveBeenCalled();
  fixture.adminMode.mockRejectedValue(new AdminRegistrationError(403));
  fixture.store!.isAdmin = true;
  await flushPromises();
  expect(fixture.adminWaitlist).not.toHaveBeenCalled();
  expect(view!.text()).toContain('could not be verified');
  expect(view!.text()).not.toContain(row.email);
  expect(view!.find('select').exists()).toBe(false);
});
test('instance-level mode requires explicit review and confirmation; roster stays available in open mode', async () => {
  render('pt-BR');
  await flushPromises();
  await view!.get('select').setValue('OPEN');
  expect(fixture.setAdminMode).not.toHaveBeenCalled();
  await click('Revisar alteração do modo');
  expect(view!.text()).toContain('Cadastro aberto');
  await click('cancel-test');
  expect(fixture.setAdminMode).not.toHaveBeenCalled();
  await click('Revisar alteração do modo');
  await click('confirm-test');
  expect(fixture.setAdminMode).toHaveBeenCalledExactlyOnceWith('OPEN', expect.any(AbortSignal));
  expect(view!.text()).toContain('Modo atual: Cadastro aberto');
  expect(view!.text()).toContain(row.email);
});
test('unknown result warning, explicit retry, and runtime code hidden after session change', async () => {
  render();
  await flushPromises();
  await click('Send invitation');
  expect(view!.text()).toContain(row.email);
  await click('confirm-test');
  expect(fixture.inviteWaitlist).toHaveBeenCalledExactlyOnceWith(id, expect.any(AbortSignal));
  expect(hasCode()).toBe(true);
  expect(view!.text()).not.toContain('delivered');
  await click('Retry email submission');
  expect(view!.text()).toContain('duplicate email');
  await click('cancel-test');
  expect(fixture.inviteWaitlist).toHaveBeenCalledTimes(1);
  fixture.store!.user.isLoged = false;
  await flushPromises();
  expect(hasCode()).toBe(false);
  expect(view!.text()).not.toContain(row.email);
});
test('in-flight write from old generation never populates new admin view', async () => {
  let resolve!: (value: string) => void;
  fixture.setAdminMode.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render();
  await flushPromises();
  await view!.get('select').setValue('OPEN');
  await click('Review mode change');
  await click('confirm-test');
  fixture.store!.user.generation = 'fresh';
  await flushPromises();
  resolve('OPEN');
  await flushPromises();
  expect(view!.text()).toContain('Current mode: Waitlist');
  expect(view!.text()).not.toContain('Current mode: Open registration');
});
test('cursor pagination and unknown command failure require explicit refresh, not automatic send', async () => {
  fixture.adminWaitlist
    .mockResolvedValueOnce({ items: [row], next_cursor: id })
    .mockResolvedValueOnce({
      items: [{ ...row, request_id: otherId, email: 'another@example.invalid' }],
      next_cursor: null,
    });
  render();
  await flushPromises();
  await click('Next');
  expect(fixture.adminWaitlist).toHaveBeenLastCalledWith(id, expect.any(AbortSignal));
  expect(view!.text()).not.toContain(row.email);
  expect(view!.text()).toContain('another@example.invalid');
  fixture.inviteWaitlist.mockRejectedValueOnce(new AdminRegistrationError());
  await click('Send invitation');
  await click('confirm-test');
  expect(fixture.inviteWaitlist).toHaveBeenCalledTimes(1);
  expect(view!.text()).toContain('Do not assume the email was not sent.');
  expect(view!.text()).not.toContain('another@example.invalid');
  await click('Refresh settings and requests');
  expect(fixture.inviteWaitlist).toHaveBeenCalledTimes(1);
});

test('native custom select and confirmation cancellation return focus without mutation', async () => {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        registrationAdmin: en,
        components: { cancel: 'Cancel', confirmTitle: 'Confirm', closeDialog: 'Close dialog' },
      },
    },
    missingWarn: false,
  });
  view = mount(Tab, { attachTo: document.body, global: { plugins: [i18n] } });
  await flushPromises();
  await view.get('[role="combobox"]').trigger('click');
  await flushPromises();
  const option = view
    .findAll('[role="option"]')
    .find((item) => item.text().includes('Open registration'));
  expect(option).toBeDefined();
  await option!.trigger('click');
  await flushPromises();
  const review = view.findAll('button').find((item) => item.text() === 'Review mode change');
  expect(review).toBeDefined();
  review!.element.focus();
  await review!.trigger('click');
  await flushPromises();
  const dialog = view.get('dialog');
  expect((dialog.element as HTMLDialogElement).open).toBe(true);
  expect(view.text()).toContain('Set registration for this instance');
  await dialog.trigger('cancel');
  await flushPromises();
  expect(fixture.setAdminMode).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(review!.element);
});
