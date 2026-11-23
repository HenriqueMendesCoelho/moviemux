import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { reactive } from 'vue';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/ranking-entry-recovery.json';
import pt from '../../i18n/locales/pt-BR/ranking-entry-recovery.json';

const kit = vi.hoisted(() => ({
  list: vi.fn(),
  restoreCurrent: vi.fn(),
  preview: vi.fn(),
  remove: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingEntryRecoveryService', async (original) => ({
  ...(await original<object>()),
  default: kit,
}));
vi.mock('../../src/modules/ranking/services/RankingEntryRemovalService', async (original) => ({
  ...(await original<object>()),
  default: kit,
}));
import Panel from '../../src/modules/ranking/components/RankingEntryRecovery.vue';
import { RankingEntryRecoveryError } from '../../src/modules/ranking/services/RankingEntryRecoveryService';

const id = 'abcdefab-2222-4222-8222-222222222222';
const entry = 'abcdefab-3333-4333-8333-333333333333';
const row = {
  entry_id: entry,
  title: 'Film <subject>',
  version: '9007199254740997',
  removed_at: '2026-11-23T01:02:03.123456789Z',
  expires_at: '2026-11-24T01:02:03.123456789Z',
};
const page = { items: [row], next_cursor: null };
const empty = { items: [], next_cursor: null };
const receipt = { removed_at: null, version: 9007199254740996n };
let view: VueWrapper | undefined;
function open(locale = 'en', attachTo?: HTMLElement) {
  view = mount(Panel, {
    attachTo,
    props: { rankingId: id, entry: { id: entry, title: row.title } },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          missingWarn: false,
          fallbackWarn: false,
          messages: {
            en: { rankingEntryRecovery: en, components: { cancel: 'Cancel' } },
            'pt-BR': { rankingEntryRecovery: pt, components: { cancel: 'Cancelar' } },
          },
        }),
      ],
    },
  });
  return view;
}
async function click(label: string) {
  const button = view?.findAll('button').find((b) => b.text() === label);
  if (!button) throw new Error(`Missing button ${label}`);
  await button.trigger('click');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.list.mockResolvedValue(page);
  kit.preview.mockResolvedValue(receipt);
  kit.remove.mockResolvedValue({ ...receipt, ...row, version: 9007199254740997n });
  kit.restoreCurrent.mockResolvedValue({ entry_id: entry, version: '9007199254740998' });
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
afterEach(() => view?.unmount());

test('preview and cancel never remove; explicit confirmation shows 24h and refetches', async () => {
  const panel = open('pt-BR');
  expect(kit.list).not.toHaveBeenCalled();
  await click(pt.remove);
  expect(panel.text()).toContain('24 horas');
  expect(panel.text()).toContain('a remoção é definitiva');
  expect(kit.remove).not.toHaveBeenCalled();
  await click('Cancelar');
  expect(kit.remove).not.toHaveBeenCalled();
  await click(pt.remove);
  await click(pt.removeConfirm);
  expect(kit.remove).toHaveBeenCalledExactlyOnceWith(id, entry, receipt.version);
  expect(panel.emitted('changed')).toEqual([['remove', entry]]);
  expect(panel.text()).toContain('Você pode restaurá-lo aqui até');
  expect(kit.list).toHaveBeenCalledTimes(1);
});
test('new mount restores server-current item with the exact version after separate confirmation', async () => {
  const panel = open();
  await click(en.open);
  expect(panel.text()).toContain(row.title);
  expect(panel.html()).toContain('&lt;subject&gt;');
  expect(panel.findAll('time')).toHaveLength(2);
  expect(panel.html()).not.toContain(row.version);
  await click(en.restore);
  expect(kit.restoreCurrent).not.toHaveBeenCalled();
  kit.list.mockResolvedValueOnce(empty);
  await click(en.restoreConfirm);
  expect(kit.restoreCurrent).toHaveBeenCalledExactlyOnceWith(id, entry, row.version);
  expect(panel.emitted('changed')).toEqual([['restore', entry]]);
  expect(panel.text()).toContain(en.restored);
  expect(panel.text()).not.toContain(row.title);
});
test.each([
  ['ranking.entry_recovery_expired', en.expired],
  ['ranking.entry_state_stale', en.stale],
] as const)('conflict refetches without auto-retry (%s)', async (code, expected) => {
  const panel = open();
  await click(en.open);
  await click(en.restore);
  kit.restoreCurrent.mockRejectedValueOnce(new RankingEntryRecoveryError(409, code));
  kit.list.mockResolvedValueOnce(empty);
  await click(en.restoreConfirm);
  expect(kit.restoreCurrent).toHaveBeenCalledTimes(1);
  expect(kit.list).toHaveBeenCalledTimes(2);
  expect(panel.text()).toContain(expected);
  expect(panel.text()).not.toContain(en.restored);
  expect(panel.emitted('reconcile')).toHaveLength(1);
});
test('uncertain result does not surface raw error, auto-retry, or claim success', async () => {
  const panel = open();
  await click(en.open);
  await click(en.restore);
  kit.restoreCurrent.mockRejectedValueOnce(new Error('internal-secret'));
  await click(en.restoreConfirm);
  expect(panel.text()).toContain(en.unknown);
  expect(panel.text()).not.toContain('internal-secret');
  expect(kit.restoreCurrent).toHaveBeenCalledTimes(1);
  expect(kit.list).toHaveBeenCalledTimes(2);
  expect(panel.emitted('changed')).toBeUndefined();
});
test('no title inference and no retained metadata across a session or scope reset', async () => {
  kit.list.mockResolvedValueOnce({ ...page, items: [{ ...row, title: null }] });
  const panel = open();
  await click(en.open);
  expect(panel.text()).toContain(en.untitled);
  expect(panel.text()).not.toContain(row.title);
  await click(en.close);
  const delayed = Promise.withResolvers<typeof page>();
  kit.list.mockReturnValueOnce(delayed.promise);
  await click(en.open);
  if (kit.user) kit.user.user.generation = 'b';
  delayed.resolve(page);
  await flushPromises();
  expect(panel.text()).not.toContain(row.title);
  expect(panel.findAll('time')).toHaveLength(0);
  kit.list.mockRejectedValueOnce(new RankingEntryRecoveryError(404, 'ranking.not_found'));
  await click(en.open);
  expect(panel.text()).toContain(en.notAvailable);
  expect(panel.text()).not.toContain(row.title);
});

test('a directory authorization check cannot race a title-bearing removal preview', async () => {
  const first = Promise.withResolvers<typeof page>();
  kit.list.mockReturnValueOnce(first.promise);
  const panel = open();
  await click(en.open);
  const remove = panel.findAll('button').find((button) => button.text() === en.remove);
  expect(remove?.attributes('disabled')).toBeDefined();
  await click(en.remove);
  expect(kit.preview).not.toHaveBeenCalled();
  first.reject(new RankingEntryRecoveryError(404, 'ranking.not_found'));
  await flushPromises();
  expect(panel.text()).toContain(en.notAvailable);
  expect(panel.text()).not.toContain(row.title);
  expect(panel.find('dialog').attributes('open')).toBeUndefined();
});

test('cancelling an async preview returns focus to its original remove button', async () => {
  const panel = open('en', document.body);
  const opener = panel.findAll('button').find((b) => b.text() === en.remove);
  if (!opener) throw new Error('Missing removal opener');
  opener.element.focus();
  await click(en.remove);
  await click('Cancel');
  expect(document.activeElement).toBe(opener.element);
  expect(kit.remove).not.toHaveBeenCalled();
});
