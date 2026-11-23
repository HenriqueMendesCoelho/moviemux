import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
const messages = { en: en.rankingRoundPanel, 'pt-BR': pt.rankingRoundPanel };
const kit = vi.hoisted(() => ({
  enter: vi.fn(),
  aggregate: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingRoundService', () => ({ default: kit }));
import Panel from '../../src/modules/ranking/components/RankingRoundPanel.vue';
import Own from '../../src/modules/ranking/components/RankingOwnRating.vue';
const scope = {
  rankingId: '11111111-1111-4111-8111-111111111111',
  entryId: '22222222-2222-4222-8222-222222222222',
  roundId: '33333333-3333-4333-8333-333333333333',
};
const round = {
  round_id: scope.roundId,
  number: 4,
  description: 'Verbatim note\n' + 'long'.repeat(120),
  created_at: 'test',
  updated_at: null,
  revealed: false,
};
let w: VueWrapper | undefined;
function view(revealed: boolean | null = false, locale = 'en') {
  w = mount(Panel, {
    props: {
      rankingId: scope.rankingId,
      entryId: scope.entryId,
      entryTitle: 'Movie',
      round: { ...round, revealed },
      canRate: true,
      reconcile: false,
    },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          messages: {
            en: { ...en, rankingRoundPanel: messages.en },
            'pt-BR': { ...pt, rankingRoundPanel: messages['pt-BR'] },
          },
        }),
      ],
      stubs: { RankingOwnRating: true },
    },
  });
  return w;
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.enter.mockResolvedValue({ round_id: scope.roundId, round_number: 4, revealed: true });
  kit.aggregate.mockResolvedValue({
    round_id: scope.roundId,
    revealed: true,
    total: 9007199254740993n,
    votes: 5n,
  });
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('mount/prop edits never enter; explicit click triggers exactly one scoped disclosure', async () => {
  view();
  await w!.setProps({ entryTitle: 'New title' });
  expect(kit.enter).not.toHaveBeenCalled();
  expect(kit.aggregate).not.toHaveBeenCalled();
  expect(w!.findComponent(Own).exists()).toBe(false);
  const button = w!.get('button');
  const first = button.trigger('click');
  await button.trigger('click');
  await first;
  await flushPromises();
  expect(kit.enter).toHaveBeenCalledTimes(1);
  expect(kit.enter).toHaveBeenCalledWith(scope, expect.any(AbortSignal));
  expect(kit.aggregate).toHaveBeenCalledWith(scope, expect.any(AbortSignal));
  expect(button.attributes('aria-expanded')).toBe('true');
  expect(w!.text()).toContain('9007199254740993 / 5');
  expect(w!.text()).toContain(round.description.slice(0, 12));
  expect(w!.getComponent(Own).props('targetLabel')).toBe('New title · Round 4');
  expect(w!.emitted('transitioned')).toEqual([[scope]]);
  await button.trigger('click');
  await button.trigger('click');
  await flushPromises();
  expect(w!.emitted('transitioned')).toHaveLength(1);
});
test('same-ID parent disclosure replacement preserves open panel and its exact aggregate', async () => {
  view();
  await w!.get('button').trigger('click');
  await flushPromises();
  await w!.setProps({ round: { ...round, revealed: true } });
  await flushPromises();
  expect(w!.get('button').attributes('aria-expanded')).toBe('true');
  expect(w!.findComponent(Own).exists()).toBe(true);
  expect(w!.text()).toContain('9007199254740993 / 5');
  expect(kit.enter).toHaveBeenCalledTimes(1);
  expect(kit.aggregate).toHaveBeenCalledTimes(1);
  kit.user!.user = { generation: 'a', isLoged: true };
  await flushPromises();
  expect(w!.get('button').attributes('aria-expanded')).toBe('true');
});
test.each([false, null])(
  'unrevealed %s keeps own rating but no scores or aggregate request',
  async (revealed) => {
    kit.enter.mockResolvedValueOnce({ round_id: scope.roundId, round_number: 4, revealed });
    view(revealed, 'pt-BR');
    await w!.get('button').trigger('click');
    await flushPromises();
    expect(w!.text()).toContain('Rodada 4');
    expect(w!.findComponent(Own).exists()).toBe(true);
    expect(w!.text()).not.toContain(messages['pt-BR'].mean);
    expect(kit.aggregate).not.toHaveBeenCalled();
    expect(w!.emitted('transitioned')).toBeUndefined();
  },
);
test('existing true and null-to-true do not emit false-to-true transition', async () => {
  view(null);
  await w!.get('button').trigger('click');
  await flushPromises();
  expect(w!.emitted('transitioned')).toBeUndefined();
  await w!.get('button').trigger('click');
  await w!.get('button').trigger('click');
  await flushPromises();
  expect(w!.emitted('transitioned')).toBeUndefined();
});
test('zero numeric votes means no mean, zero score with votes is visible, using only pure read for refresh', async () => {
  kit.aggregate.mockResolvedValueOnce({
    round_id: scope.roundId,
    revealed: true,
    total: 0n,
    votes: 0n,
  });
  view();
  await w!.get('button').trigger('click');
  await flushPromises();
  expect(w!.text()).toContain(messages.en.noVotes);
  expect(w!.text()).not.toContain('0 / 0');
  kit.aggregate.mockResolvedValueOnce({
    round_id: scope.roundId,
    revealed: true,
    total: 0n,
    votes: 1n,
  });
  w!.getComponent(Own).vm.$emit('confirmed');
  await flushPromises();
  expect(w!.text()).toContain('0 / 1');
  expect(kit.enter).toHaveBeenCalledTimes(1);
});
test('stale response after logout does not open, trigger aggregate, or emit', async () => {
  let resolve!: (v: unknown) => void;
  kit.enter.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  view();
  await w!.get('button').trigger('click');
  kit.user!.user.isLoged = false;
  resolve({ round_id: scope.roundId, round_number: 4, revealed: true });
  await flushPromises();
  expect(w!.findComponent(Own).exists()).toBe(false);
  expect(kit.aggregate).not.toHaveBeenCalled();
  expect(w!.emitted('transitioned')).toBeUndefined();
});
test('mismatched detail or aggregate never discloses; denied status reports lost scope', async () => {
  kit.enter.mockResolvedValueOnce({ round_id: scope.entryId, round_number: 4, revealed: true });
  view();
  await w!.get('button').trigger('click');
  await flushPromises();
  expect(w!.text()).toContain(messages.en.unavailable);
  expect(kit.aggregate).not.toHaveBeenCalled();
  kit.aggregate.mockResolvedValueOnce({
    round_id: scope.roundId,
    revealed: false,
    total: null,
    votes: null,
  });
  await w!.get('button').trigger('click');
  await flushPromises();
  expect(w!.text()).toContain(messages.en.aggregateError);
  kit.aggregate.mockRejectedValueOnce({ response: { status: 404 } });
  await w!
    .findAll('button')
    .find((button) => button.text() === en.rankingDetail.retry)!
    .trigger('click');
  await flushPromises();
  expect(w!.emitted('scopeLost')).toEqual([[404]]);
  expect(w!.findComponent(Own).exists()).toBe(false);
});

test('SSR never calls the side-effecting detail or the pure round aggregate', async () => {
  const app = createSSRApp(Panel, {
    rankingId: scope.rankingId,
    entryId: scope.entryId,
    entryTitle: 'Movie',
    round,
    canRate: true,
    reconcile: false,
  });
  app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }));
  const html = await renderToString(app);
  expect(html).toContain(messages.en.open);
  expect(html).not.toContain('Verbatim note');
  expect(kit.enter).not.toHaveBeenCalled();
  expect(kit.aggregate).not.toHaveBeenCalled();
});
test.each(['draft', 'pending'] as const)(
  'collapse preserves own editor during %s',
  async (state) => {
    view(null);
    await w!.get('button').trigger('click');
    await flushPromises();
    const own = w!.getComponent(Own);
    own.vm.$emit('interaction', state);
    await w!.get('button').trigger('click');
    expect(w!.findComponent(Own).exists()).toBe(true);
    expect(w!.text()).toContain(state === 'draft' ? messages.en.finishDraft : messages.en.busy);
    own.vm.$emit('interaction', 'idle');
    await w!.get('button').trigger('click');
    expect(w!.findComponent(Own).exists()).toBe(false);
  },
);
