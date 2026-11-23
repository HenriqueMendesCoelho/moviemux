import { reactive } from 'vue';
import { createI18n } from 'vue-i18n';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import enLocale from '../../i18n/locales/en';
import ptLocale from '../../i18n/locales/pt-BR';
const fixture = vi.hoisted(() => ({
  issue: vi.fn(),
  revoke: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => fixture.user }));
vi.mock('../../src/modules/ranking/services/RankingInvitationIssuerService', () => ({
  default: fixture,
}));
import Issuer from '../../src/modules/ranking/components/RankingInvitationIssuer.vue';
const id = '11111111-1111-4111-8111-111111111111',
  inv = '22222222-2222-4222-8222-222222222222';
const code = 'aX-_AbCdefGhijkLMNopqQ',
  receipt = { invite_id: inv, expires_at: '2026-11-29T12:00:00Z' };
const en = enLocale.rankingInvitationIssuer;
let w: VueWrapper | undefined;
function render(canInvite = true, locale = 'en') {
  w = mount(Issuer, {
    props: { rankingId: id, canInvite },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          messages: {
            en: enLocale,
            'pt-BR': ptLocale,
          },
        }),
      ],
    },
  });
  return w;
}
async function click(text: string) {
  const button = w?.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Missing button: ${text}`);
  await button.trigger('click');
}
async function submit(value = code) {
  await w!.get('input').setValue(value);
  await w!.get('form').trigger('submit');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.user = reactive({ user: { generation: 'a', isLoged: true } });
  fixture.issue.mockResolvedValue(receipt);
  fixture.revoke.mockResolvedValue(undefined);
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('capability and session required; valid code only sent after explicit submit', async () => {
  render(false);
  expect(w!.find('section').exists()).toBe(false);
  await w!.setProps({ canInvite: true });
  expect(fixture.issue).not.toHaveBeenCalled();
  await click(en.open);
  await w!.get('input').setValue(code);
  expect(fixture.issue).not.toHaveBeenCalled();
  await submit();
  expect(fixture.issue.mock.calls).toEqual([[id, code]]);
  expect(w!.text()).toContain(en.sent);
  expect(w!.get('time').attributes('datetime')).toBe(receipt.expires_at);
  expect(w!.html()).not.toContain(code);
  expect(w!.html()).not.toContain(inv);
  fixture.user!.user.isLoged = false;
  await flushPromises();
  expect(w!.find('section').exists()).toBe(false);
});
test('PT-BR exact case-sensitive code, invalid whitespace, Escape clears draft', async () => {
  const pt = ptLocale.rankingInvitationIssuer;
  render(true, 'pt-BR');
  await click(pt.open);
  for (const bad of [' ' + code, code + ' ', code.slice(0, -1) + 'R']) {
    await submit(bad);
    expect(w!.text()).toContain(pt.invalid);
  }
  expect(fixture.issue).not.toHaveBeenCalled();
  await w!.get('input').trigger('keydown', { key: 'Escape' });
  expect(w!.find('input').exists()).toBe(false);
  await click(pt.open);
  expect((w!.get('input').element as HTMLInputElement).value).toBe('');
});
test('unknown result clears code and blocks blind repeat in current scope', async () => {
  fixture.issue.mockRejectedValueOnce(new Error('body with code that must never show ' + code));
  render();
  await click(en.open);
  await submit();
  expect(w!.text()).toContain(en.issueUncertain);
  expect(w!.html()).not.toContain(code);
  expect(w!.find('button').exists()).toBe(false);
  expect(fixture.issue).toHaveBeenCalledTimes(1);
});
test.each([
  [400, 'ranking.invalid_invitation', 'invalid'],
  [409, 'ranking.invitation_exists', 'duplicate'],
  [503, 'ranking.invitation_address_unavailable', 'serviceUnavailable'],
  [429, '', 'retryLater'],
])('sanitized %s maps to localized copy, clears submitted code', async (status, safeCode, key) => {
  fixture.issue.mockRejectedValueOnce({
    response: { status, data: { data: { code: safeCode }, other: 'secret' } },
  });
  render();
  await click(en.open);
  await submit();
  expect(w!.text()).toContain(en[key as keyof typeof en]);
  expect(w!.text()).not.toContain('secret');
  expect((w!.get('input').element as HTMLInputElement).value).toBe('');
});
test('only known receipt can be revoked, after explicit confirmation', async () => {
  render();
  await click(en.open);
  await submit();
  await click(en.revoke);
  expect(w!.text()).toContain(en.revokeWarning);
  expect(fixture.revoke).not.toHaveBeenCalled();
  await click(en.cancel);
  expect(fixture.revoke).not.toHaveBeenCalled();
  await click(en.revoke);
  await click(en.confirmRevoke);
  await flushPromises();
  expect(fixture.revoke.mock.calls).toEqual([[id, inv]]);
  expect(w!.text()).toContain(en.revoked);
  expect(w!.find('time').exists()).toBe(false);
});
test('scope changes abandon old receipt, duplicate clicks do not send twice', async () => {
  let resolve!: (result: typeof receipt) => void;
  fixture.issue.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render();
  await click(en.open);
  await w!.get('input').setValue(code);
  const form = w!.get('form');
  const first = form.trigger('submit');
  await form.trigger('submit');
  await first;
  expect(fixture.issue).toHaveBeenCalledTimes(1);
  expect(w!.find('input').exists()).toBe(false);
  await w!.setProps({ rankingId: '33333333-3333-4333-8333-333333333333' });
  resolve(receipt);
  await flushPromises();
  expect(w!.find('time').exists()).toBe(false);
  expect(w!.text()).not.toContain(en.sent);
});

test.each([401, 403, 404])(
  'denied issue %s blocks action and requests parent scope refresh',
  async (status) => {
    fixture.issue.mockRejectedValueOnce({ response: { status } });
    render();
    await click(en.open);
    await submit();
    expect(w!.emitted('accessLost')).toEqual([[status]]);
    expect(w!.find('input').exists()).toBe(false);
    expect(w!.find('button').exists()).toBe(false);
  },
);
