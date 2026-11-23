import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/ranking-repeated-rounds.json';
import pt from '../../i18n/locales/pt-BR/ranking-repeated-rounds.json';
import type { RoundCreationIntent } from '../../src/modules/ranking/services/RankingRepeatedRoundService';
const kit = vi.hoisted(() => ({
  settings: vi.fn(),
  setSettings: vi.fn(),
  create: vi.fn(),
  rounds: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingRepeatedRoundService', () => ({ default: kit }));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({ default: kit }));
import Settings from '../../src/modules/ranking/components/RankingRepeatedRoundsSettings.vue';
import Form from '../../src/modules/ranking/components/RankingNewRoundForm.vue';
const rank = 'abcdefab-2222-4222-8222-222222222222',
  entry = '22222222-2222-4222-8222-222222222222',
  command = '33333333-3333-4333-8333-333333333333';
const round = '44444444-4444-4444-8444-444444444444';
const restored = {
  rankingId: rank,
  entryId: entry,
  generation: 'a',
  commandId: command,
  description: 'prior',
};
let w: VueWrapper | undefined, saved: RoundCreationIntent | null;
const i18n = (locale: string) =>
  createI18n({
    legacy: false,
    locale,
    messages: { en: { rankingRepeatedRounds: en }, 'pt-BR': { rankingRepeatedRounds: pt } },
  });
function settings() {
  w = mount(Settings, { props: { rankingId: rank }, global: { plugins: [i18n('en')] } });
  return w;
}
function form(
  props: {
    ownerAuthorized?: boolean;
    repeatEnabled?: boolean;
    intent?: RoundCreationIntent | null;
  } = {},
  locale = 'en',
) {
  w = mount(Form, {
    props: {
      rankingId: rank,
      entryId: entry,
      ownerAuthorized: true,
      repeatEnabled: true,
      intent: saved,
      'onUpdate:intent': (value: RoundCreationIntent | null) => {
        saved = value;
        void w?.setProps({ intent: value });
      },
      ...props,
    },
    global: { plugins: [i18n(locale)] },
  });
  return w;
}
async function click(label: string) {
  const b = w?.findAll('button').find((x) => x.text() === label);
  if (!b) throw new Error(`Missing button: ${label}`);
  await b.trigger('click');
  await flushPromises();
}
async function enter(description: string, label = en.open) {
  await click(label);
  await w!.get('textarea').setValue(description);
  await w!.get('form').trigger('submit');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  saved = null;
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.settings.mockResolvedValue(false);
  kit.setSettings.mockImplementation(async (_id, value) => value);
  kit.create.mockResolvedValue({ roundId: round, ordinal: 2n, replayed: false });
  kit.rounds.mockResolvedValue({ items: [], next_cursor: null });
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test.each([403, 404, 502])(
  'old/non-owner/denied settings %s do not expose controls',
  async (status) => {
    kit.settings.mockRejectedValueOnce({ response: { status } });
    settings();
    await flushPromises();
    expect(w!.find('section').exists()).toBe(false);
    expect(kit.setSettings).not.toHaveBeenCalled();
  },
);
test('no SSR authority fetch; client GET is authority, PUT deliberate with no optimistic toggle', async () => {
  const app = createSSRApp(Settings, { rankingId: rank });
  app.use(i18n('en'));
  expect(await renderToString(app)).not.toContain(en.turnOn);
  expect(kit.settings).not.toHaveBeenCalled();
  settings();
  await flushPromises();
  expect(w!.text()).toContain(en.disabled);
  const done = Promise.withResolvers<boolean>();
  kit.setSettings.mockReturnValueOnce(done.promise);
  await click(en.turnOn);
  expect(w!.text()).toContain(en.disabled);
  expect(kit.setSettings).toHaveBeenCalledExactlyOnceWith(rank, true);
  done.resolve(true);
  await flushPromises();
  expect(w!.text()).toContain(en.enabled);
});
test('uncertain settings clears write controls; explicit GET reauthorizes without another PUT', async () => {
  kit.setSettings.mockRejectedValueOnce(new Error('unknown'));
  settings();
  await flushPromises();
  await click(en.turnOn);
  expect(w!.text()).toContain(en.settingsUncertain);
  expect(w!.emitted('settings')?.at(-1)).toEqual([null]);
  expect(w!.findAll('button').some((b) => b.text() === en.turnOn)).toBe(false);
  kit.settings.mockResolvedValueOnce(true);
  await click(en.checkSettings);
  expect(kit.setSettings).toHaveBeenCalledTimes(1);
  expect(w!.text()).toContain(en.enabled);
});
test('current owner and enabled policy are necessary for any new intent, cancel sends nothing', async () => {
  form({ ownerAuthorized: false });
  expect(w!.find('section').exists()).toBe(false);
  await w!.setProps({ ownerAuthorized: true, repeatEnabled: false });
  expect(w!.find('button').exists()).toBe(false);
  await w!.setProps({ repeatEnabled: true });
  await click(en.open);
  await w!.get('textarea').setValue('draft');
  await click(en.cancel);
  expect(kit.create).not.toHaveBeenCalled();
  expect(w!.emitted('interaction')?.at(-1)).toEqual(['idle']);
});
test('canonical prompt once and exact ordinal success does not trigger reads or reveal', async () => {
  kit.create.mockResolvedValueOnce({
    roundId: round,
    ordinal: 9223372036854775807n,
    replayed: false,
  });
  form({}, 'pt-BR');
  await enter('\u0085 🎬 texto  ', pt.open);
  expect(kit.create).toHaveBeenCalledTimes(1);
  expect(kit.create.mock.calls[0]![0]).toMatchObject({
    rankingId: rank,
    entryId: entry,
    generation: 'a',
    description: '🎬 texto',
  });
  expect(w!.text()).toContain('Rodada 9223372036854775807 criada.');
  expect(w!.emitted('created')).toEqual([
    [
      {
        roundId: round,
        ordinal: 9223372036854775807n,
        replayed: false,
        rankingId: rank,
        entryId: entry,
      },
    ],
  ]);
  expect(saved).toBeNull();
  expect(kit.rounds).not.toHaveBeenCalled();
});
test('unknown intent survives remount and replay only follows explicit authoritative check, even when policy off', async () => {
  kit.create.mockRejectedValueOnce(new Error('unknown'));
  form();
  await enter('first');
  const first = saved;
  expect(first).not.toBeNull();
  expect(w!.emitted('interaction')?.at(-1)).toEqual(['uncertain']);
  expect(kit.rounds).not.toHaveBeenCalled();
  w!.unmount();
  form({ repeatEnabled: false });
  expect(w!.text()).toContain(en.roundUncertain);
  expect(w!.text()).not.toContain(en.retrySame);
  await click(en.checkRounds);
  expect(kit.settings).toHaveBeenCalledWith(rank, expect.any(AbortSignal));
  expect(kit.rounds).toHaveBeenCalledWith(rank, entry, undefined, expect.any(AbortSignal));
  expect(kit.create).toHaveBeenCalledTimes(1);
  kit.create.mockResolvedValueOnce({ roundId: round, ordinal: 2n, replayed: true });
  await click(en.retrySame);
  expect(kit.create.mock.calls[1]![0]).toEqual(first);
  expect(w!.text()).toContain('Round 2 was already recorded.');
  expect(saved).toBeNull();
});
test('old author/route/scope cannot reuse an intent or publish a late response', async () => {
  saved = { ...restored, generation: 'another' };
  form();
  expect(w!.text()).not.toContain(en.roundUncertain);
  const request = Promise.withResolvers<{ roundId: string; ordinal: bigint; replayed: boolean }>();
  kit.create.mockReturnValueOnce(request.promise);
  await enter('current');
  kit.user!.user.generation = 'b';
  request.resolve({ roundId: round, ordinal: 2n, replayed: false });
  await flushPromises();
  expect(w!.emitted('created')).toBeUndefined();
  expect(w!.text()).not.toContain(en.roundUncertain);
});
