import { reactive } from 'vue';
import { createI18n } from 'vue-i18n';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import ptBR from '../../i18n/locales/pt-BR';
const adapters = vi.hoisted(() => ({
  read: vi.fn(),
  rotate: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => adapters.user }));
vi.mock('../../src/modules/ranking/services/RankingInvitationService', () => ({
  default: { readAddress: adapters.read, rotateAddress: adapters.rotate },
}));
import Address from '../../src/modules/ranking/components/RankingInvitationAddress.vue';
import ProfileView from '../../src/modules/profile/views/ProfileView.vue';
const old = 'aX-_AbCdefGhijkLMNopqQ',
  fresh = 'aX-_AbCdefGhijkLMNopqA';
const messages = en.rankingInvitationAddress;
let w: VueWrapper | undefined;
const writeText = vi.fn();
let clipboard: PropertyDescriptor | undefined;
function view(locale = 'en') {
  w = mount(Address, {
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          messages: {
            en,
            'pt-BR': ptBR,
          },
        }),
      ],
    },
  });
  return w;
}
async function click(text: string) {
  const button = w!.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Missing button: ${text}`);
  await button.trigger('click');
}
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  adapters.user = reactive({ user: { generation: 'a', isLoged: true } });
  adapters.read.mockResolvedValue(old);
  adapters.rotate.mockResolvedValue(fresh);
  clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(() => {
  w?.unmount();
  w = undefined;
  if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
test('private initial view does not fetch, copy, or put code in DOM; hide removes code', async () => {
  view();
  await flushPromises();
  expect(adapters.read).not.toHaveBeenCalled();
  expect(w!.html()).not.toContain(old);
  await click(messages.reveal);
  await flushPromises();
  expect(w!.get('code').text()).toBe(old);
  expect(writeText).not.toHaveBeenCalled();
  await click(messages.hide);
  expect(w!.html()).not.toContain(old);
  await click(messages.reveal);
  await flushPromises();
  expect(adapters.read).toHaveBeenCalledTimes(2);
});
test('null requires explicit generate, existing requires confirmation, cancel leaves code untouched', async () => {
  adapters.read.mockResolvedValueOnce(null);
  view();
  await click(messages.reveal);
  await flushPromises();
  expect(w!.text()).toContain(messages.empty);
  expect(adapters.rotate).not.toHaveBeenCalled();
  await click(messages.generate);
  await flushPromises();
  expect(w!.get('code').text()).toBe(fresh);
  await click(messages.rotate);
  expect(w!.text()).toContain(messages.rotateWarning);
  await click(messages.cancel);
  expect(adapters.rotate).toHaveBeenCalledTimes(1);
  await click(messages.rotate);
  await click(messages.confirmRotate);
  await flushPromises();
  expect(adapters.rotate).toHaveBeenCalledTimes(2);
});
test('pending rotation drops old code, disallows repeated submissions and no blind retry after uncertainty', async () => {
  const pending = deferred<string>();
  adapters.rotate.mockReturnValueOnce(pending.promise);
  view();
  await click(messages.reveal);
  await flushPromises();
  await click(messages.rotate);
  await click(messages.confirmRotate);
  expect(w!.html()).not.toContain(old);
  expect(adapters.rotate).toHaveBeenCalledTimes(1);
  await click(messages.hide);
  expect(w!.get('button').attributes()).toHaveProperty('disabled');
  pending.resolve(fresh);
  await flushPromises();
  expect(w!.html()).not.toContain(fresh);
  await click(messages.reveal);
  await flushPromises();
  adapters.rotate.mockRejectedValueOnce(new Error('unconfirmed'));
  await click(messages.rotate);
  await click(messages.confirmRotate);
  await flushPromises();
  expect(w!.text()).toContain(messages.uncertain);
  expect(w!.findAll('button').map((b) => b.text())).toEqual([messages.hide, messages.check]);
  await click(messages.check);
  await flushPromises();
  expect(adapters.rotate).toHaveBeenCalledTimes(2);
  expect(adapters.read).toHaveBeenCalledTimes(3);
});
test('hide, account switch, and logout discard stale reads and abort the old scope', async () => {
  const pending = deferred<string>();
  adapters.read.mockReturnValueOnce(pending.promise);
  view();
  await click(messages.reveal);
  await click(messages.hide);
  expect(adapters.read.mock.calls[0]![0].aborted).toBe(true);
  pending.resolve(old);
  await flushPromises();
  expect(w!.html()).not.toContain(old);
  const second = deferred<string>();
  adapters.read.mockReturnValueOnce(second.promise);
  await click(messages.reveal);
  adapters.user!.user.generation = 'b';
  second.resolve(old);
  await flushPromises();
  expect(w!.html()).not.toContain(old);
  await click(messages.reveal);
  await flushPromises();
  expect(w!.html()).toContain(old);
  adapters.user!.user.isLoged = false;
  await flushPromises();
  expect(w!.find('section').exists()).toBe(false);
  expect(w!.html()).not.toContain(old);
});
test('clipboard reports only actual completion, handles rejection and ignores old completion after hide', async () => {
  view('pt-BR');
  const pt = ptBR.rankingInvitationAddress;
  await click(pt.reveal);
  await flushPromises();
  writeText.mockRejectedValueOnce(new Error('denied'));
  await click(pt.copy);
  await flushPromises();
  expect(w!.text()).toContain(pt.copyError);
  expect(w!.text()).not.toContain(pt.copied);
  const copy = deferred<void>();
  writeText.mockReturnValueOnce(copy.promise);
  await click(pt.copy);
  expect(writeText).toHaveBeenLastCalledWith(old);
  expect(w!.text()).not.toContain(pt.copied);
  copy.resolve();
  await flushPromises();
  expect(w!.text()).toContain(pt.copied);
  const other = deferred<void>();
  writeText.mockReturnValueOnce(other.promise);
  await click(pt.copy);
  await click(pt.hide);
  other.resolve();
  await flushPromises();
  expect(w!.text()).not.toContain(pt.copied);
  expect(w!.html()).not.toContain(old);
});
test('account changes during rotate cannot reveal previous account result', async () => {
  const pending = deferred<string>();
  adapters.rotate.mockReturnValueOnce(pending.promise);
  view();
  await click(messages.reveal);
  await flushPromises();
  await click(messages.rotate);
  await click(messages.confirmRotate);
  adapters.user!.user.generation = 'b';
  adapters.read.mockResolvedValue(null);
  await flushPromises();
  await click(messages.reveal);
  pending.resolve(fresh);
  await flushPromises();
  expect(w!.html()).not.toContain(fresh);
  expect(w!.text()).toContain(messages.empty);
});

test('profile data tab unmounts revealed address on switch, remounts hidden', async () => {
  w = mount(ProfileView, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en, 'pt-BR': ptBR } })],
      stubs: { PanelProfile: true, PanelSecurityProfile: true },
    },
  });
  await flushPromises();
  expect(adapters.read).not.toHaveBeenCalled();
  await click(messages.reveal);
  await flushPromises();
  expect(w.get('code').text()).toBe(old);
  await click(en.account.security);
  expect(w.findComponent(Address).exists()).toBe(false);
  expect(w.html()).not.toContain(old);
  await click(en.account.myDetails);
  expect(w.findComponent(Address).exists()).toBe(true);
  expect(w.html()).not.toContain(old);
  expect(adapters.read).toHaveBeenCalledTimes(1);
});
