import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/ranking-member-roster.json';
import pt from '../../i18n/locales/pt-BR/ranking-member-roster.json';

const kit = vi.hoisted(() => ({
  list: vi.fn(),
  replaceCapabilities: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingOwnerRosterService', async (original) => ({
  ...(await original<object>()),
  default: kit,
}));
import Panel from '../../src/modules/ranking/components/RankingMemberRoster.vue';
import { RankingOwnerRosterError } from '../../src/modules/ranking/services/RankingOwnerRosterService';

const collection = 'abcdefab-1111-4111-8111-111111111111';
const secondCollection = 'abcdefab-2222-4222-8222-222222222222';
const member = 'abcdefab-3333-4333-8333-333333333333';
const another = 'abcdefab-4444-4444-8444-444444444444';
const row = { membership_id: member, display_name: 'Person <reader>', capabilities: ['READ'] };
const hidden = { membership_id: another, display_name: null, capabilities: [] };
const page = { items: [row, hidden], next_cursor: null };
let wrapper: VueWrapper | undefined;
function language(locale: string) {
  return createI18n({
    legacy: false,
    locale,
    missingWarn: false,
    fallbackWarn: false,
    messages: {
      en: { rankingMemberRoster: en, components: { cancel: 'Cancel' } },
      'pt-BR': { rankingMemberRoster: pt, components: { cancel: 'Cancelar' } },
    },
  });
}
async function render(locale = 'en', attachTo?: HTMLElement) {
  wrapper = mount(Panel, {
    props: { rankingId: collection },
    attachTo,
    global: { plugins: [language(locale)] },
  });
  await flushPromises();
  return wrapper;
}
function button(text: string, chooser = 0) {
  const b = wrapper?.findAll('button').filter((item) => item.text() === text)[chooser];
  if (!b) throw Error(`Missing button ${text}`);
  return b;
}
async function click(text: string, chooser = 0) {
  await button(text, chooser).trigger('click');
  await flushPromises();
}
async function change(group: string, checked: boolean) {
  const input = wrapper
    ?.findAll('label')
    .find((label) => label.text() === group)
    ?.get('input');
  if (!input) throw Error(`Missing permission ${group}`);
  await input.setValue(checked);
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.list.mockResolvedValue(page);
  kit.replaceCapabilities.mockResolvedValue(undefined);
  if (!HTMLDialogElement.prototype.showModal)
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  if (!HTMLDialogElement.prototype.close)
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

test('SSR never reads or emits private roster, even for a signed-in session', async () => {
  const app = createSSRApp(Panel, { rankingId: collection });
  app.use(language('en'));
  const result = await renderToString(app);
  expect(result).not.toContain(en.open);
  expect(result).not.toContain(member);
  expect(kit.list).not.toHaveBeenCalled();
});

test.each([401, 403, 404, 503])(
  'no UI authority or data without successful roster GET (%s)',
  async (status) => {
    kit.list.mockRejectedValueOnce(new RankingOwnerRosterError(status));
    const panel = await render();
    expect(panel.text()).not.toContain(en.title);
    expect(panel.text()).not.toContain(row.display_name);
    expect(kit.replaceCapabilities).not.toHaveBeenCalled();
    expect(panel.emitted('sessionLost')?.length ?? 0).toBe(status === 401 ? 1 : 0);
  },
);

test('confirmation compares changes and uses the scoped handle; roles change only after fresh GET', async () => {
  const panel = await render();
  expect(panel.text()).not.toContain(row.display_name);
  await click(en.open);
  expect(panel.text()).toContain(row.display_name);
  expect(panel.html()).toContain('&lt;reader&gt;');
  expect(panel.text()).toContain('Member 2');
  expect(panel.html()).not.toContain(member);
  await click(en.edit);
  expect(button(en.review).attributes('disabled')).toBeDefined();
  await change(en.capabilities.ADD_ENTRY, true);
  await click(en.review);
  expect(panel.text()).toContain('Current: View collection. New: View collection, Add films.');
  expect(kit.replaceCapabilities).not.toHaveBeenCalled();
  const pending = Promise.withResolvers<void>();
  kit.replaceCapabilities.mockReturnValueOnce(pending.promise);
  await click(en.save);
  expect(kit.replaceCapabilities).toHaveBeenCalledExactlyOnceWith(collection, member, [
    'READ',
    'ADD_ENTRY',
  ]);
  expect(panel.emitted('interaction')?.at(-1)).toEqual(['pending']);
  expect(panel.text()).not.toContain(en.saved);
  expect(panel.text()).not.toContain(row.display_name);
  kit.list.mockResolvedValueOnce({
    ...page,
    items: [{ ...row, capabilities: ['READ', 'ADD_ENTRY'] }, hidden],
  });
  pending.resolve();
  await flushPromises();
  expect(panel.text()).toContain(en.saved);
  expect(panel.text()).toContain('Current permissions: View collection, Add films');
  expect(panel.emitted('interaction')?.at(-1)).toEqual(['idle']);
  expect(kit.list).toHaveBeenCalledTimes(3);
});

test('revocation has an explicit localized confirmation and cancel leaves the draft without writing', async () => {
  const panel = await render('pt-BR', document.body);
  await click(pt.open);
  await click(pt.edit);
  await change(pt.capabilities.READ, false);
  await click(pt.review);
  expect(panel.text()).toContain(pt.revokeTitle);
  expect(panel.text()).toContain('as notas não serão apagadas');
  await click('Cancelar');
  expect(document.activeElement).toBe(button(pt.review).element);
  expect(kit.replaceCapabilities).not.toHaveBeenCalled();
  await click(pt.review);
  await click(pt.revokeAll);
  expect(kit.replaceCapabilities).toHaveBeenCalledExactlyOnceWith(collection, member, []);
});

test('unknown write outcome clears projection, refetches once and cannot auto-retry', async () => {
  const panel = await render();
  await click(en.open);
  await click(en.edit);
  await change(en.capabilities.ADD_ENTRY, true);
  await click(en.review);
  kit.replaceCapabilities.mockRejectedValueOnce(new Error('private-internal-error'));
  await click(en.save);
  expect(panel.text()).toContain(en.unknown);
  expect(panel.text()).not.toContain('private-internal-error');
  expect(panel.text()).not.toContain(en.saved);
  expect(kit.replaceCapabilities).toHaveBeenCalledTimes(1);
  expect(kit.list).toHaveBeenCalledTimes(3);
  expect(panel.find('form').exists()).toBe(false);
});

test('revocation during pagination removes all previous names and hides actions', async () => {
  kit.list.mockResolvedValue({ items: [row], next_cursor: member });
  const panel = await render();
  await click(en.open);
  expect(panel.text()).toContain(row.display_name);
  kit.list.mockRejectedValueOnce(new RankingOwnerRosterError(404, 'ranking.not_found'));
  await click(en.more);
  expect(kit.list).toHaveBeenLastCalledWith(collection, member, expect.any(AbortSignal));
  expect(panel.text()).not.toContain(row.display_name);
  expect(panel.text()).not.toContain(en.open);
  expect(kit.replaceCapabilities).not.toHaveBeenCalled();
});

test('late roster result cannot restore a prior session or collection', async () => {
  const delayed = Promise.withResolvers<typeof page>();
  kit.list.mockResolvedValueOnce(page).mockReturnValueOnce(delayed.promise);
  const panel = await render();
  await click(en.open);
  const signal = kit.list.mock.calls.at(-1)?.[2] as AbortSignal;
  kit.list.mockRejectedValueOnce(new RankingOwnerRosterError(404));
  await panel.setProps({ rankingId: secondCollection });
  await flushPromises();
  expect(signal.aborted).toBe(true);
  delayed.resolve(page);
  await flushPromises();
  expect(panel.text()).not.toContain(row.display_name);
  expect(panel.text()).not.toContain(en.open);
});

test('late successful write cannot refresh, display, or announce the previous session', async () => {
  const panel = await render();
  await click(en.open);
  await click(en.edit);
  await change(en.capabilities.ADD_ENTRY, true);
  await click(en.review);
  const delayed = Promise.withResolvers<void>();
  kit.replaceCapabilities.mockReturnValueOnce(delayed.promise);
  await click(en.save);
  expect(kit.replaceCapabilities).toHaveBeenCalledTimes(1);
  if (kit.user) kit.user.user.isLoged = false;
  await flushPromises();
  delayed.resolve();
  await flushPromises();
  expect(panel.text()).not.toContain(en.saved);
  expect(panel.text()).not.toContain(row.display_name);
  expect(kit.list).toHaveBeenCalledTimes(2);
});
