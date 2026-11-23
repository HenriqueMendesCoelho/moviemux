import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '../../i18n/locales/en/ranking-detail.json';
import pt from '../../i18n/locales/pt-BR/ranking-detail.json';
import enLocale from '../../i18n/locales/en';
import ptLocale from '../../i18n/locales/pt-BR';
import Round from '../../src/modules/ranking/components/RankingRoundPanel.vue';
import Confirm from '../../src/core/components/BaseConfirmDialog.vue';
import Card from '../../src/modules/ranking/components/RankingEntryCard.vue';
import Issuer from '../../src/modules/ranking/components/RankingInvitationIssuer.vue';
const messages = { en, 'pt-BR': pt };
const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  entries: vi.fn(),
  rounds: vi.fn(),
  aggregate: vi.fn(),
  ownRating: vi.fn(),
  roundEnter: vi.fn(),
  roundAggregate: vi.fn(),
  leave: null as null | (() => boolean | Promise<boolean>),
  update: null as
    | null
    | ((
        to: { params: { rankingId: string } },
        from: { params: { rankingId: string } },
      ) => boolean | Promise<boolean>),
  user: null as any,
}));
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  onBeforeRouteLeave: (handler: NonNullable<typeof mocks.leave>) => {
    mocks.leave = handler;
  },
  onBeforeRouteUpdate: (handler: NonNullable<typeof mocks.update>) => {
    mocks.update = handler;
  },
}));
vi.mock('../../src/modules/ranking/services/RankingRoundService', () => ({
  default: { enter: mocks.roundEnter, aggregate: mocks.roundAggregate },
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', async (original) => ({
  ...(await original<any>()),
  default: mocks,
}));
import View from '../../src/modules/ranking/views/RankingDetailView.vue';
const id = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222';
const entry = {
  entry_id: id,
  movie_id: id,
  tmdb_id: null,
  original_title: 'Original',
  english_title: 'Cinema',
  portuguese_title: 'Cinema PT',
  url_image: null,
  release_date: null,
  runtime: null,
  created_at: 'date',
};
const round = {
  round_id: id,
  number: 1,
  description: 'User description',
  created_at: 'date',
  updated_at: null,
  revealed: false,
};
let w: VueWrapper;
async function render(locale = 'en', attachTo?: HTMLElement) {
  w = mount(View, {
    props: { rankingId: id },
    attachTo,
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
      stubs: { NuxtLink: { template: '<a><slot/></a>' } },
    },
  });
  await flushPromises();
  return w;
}
async function openRound() {
  await w.getComponent(Round).get('button').trigger('click');
  await flushPromises();
}
async function openRoundIfClosed() {
  if (!w.findComponent({ name: 'RankingOwnRating' }).exists()) await openRound();
}
async function readOwn() {
  await w.findComponent({ name: 'RankingOwnRating' }).get('button').trigger('click');
  await flushPromises();
}
async function open() {
  await w.get('.mm-ranking-entry-card').trigger('click');
  await flushPromises();
}
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = reactive({ user: { generation: 'a', isLoged: true } });
  mocks.summary.mockResolvedValue({
    ranking_id: id,
    name: 'Authorized ranking',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ'],
  });
  mocks.entries.mockResolvedValue({ items: [entry], next_cursor: null });
  mocks.rounds.mockResolvedValue({ items: [round], next_cursor: null });
  mocks.aggregate.mockResolvedValue({
    entry_id: id,
    total: 9007199254740993n,
    votes: 3n,
    partial: true,
  });
  mocks.ownRating.mockResolvedValue({ round_id: id, score: 0 });
  mocks.roundEnter.mockResolvedValue({ round_id: id, round_number: 1, revealed: false });
  mocks.roundAggregate.mockResolvedValue({ round_id: id, revealed: true, total: 0n, votes: 1n });
});
afterEach(() => w?.unmount());
test.each(['en', 'pt-BR'])(
  'localized rounds preserve user text and label disclosed subtotal %s',
  async (locale) => {
    await render(locale);
    await open();
    expect(w.text()).toContain(locale === 'en' ? 'Round 1' : 'Rodada 1');
    expect(mocks.roundEnter).not.toHaveBeenCalled();
    expect(mocks.roundAggregate).not.toHaveBeenCalled();
    await openRound();
    expect(w.text()).toContain('User description');
    expect(w.text()).toContain('9007199254740993 / 3');
    expect(w.text()).toContain(
      locale === 'en' ? messages.en.partialMean : messages['pt-BR'].partialMean,
    );
    expect(w.text()).not.toContain(
      locale === 'en' ? messages.en.mean + ':' : messages['pt-BR'].mean + ':',
    );
    expect(mocks.ownRating).not.toHaveBeenCalled();
    await openRoundIfClosed();
    await readOwn();
    expect(w.text()).toContain(`${locale === 'en' ? 'My rating' : 'Minha nota'}: 0`);
  },
);
test('full unequal-size aggregate displays exact ratio, zero votes not zero mean', async () => {
  mocks.aggregate.mockResolvedValue({ entry_id: id, total: 20n, votes: 3n, partial: false });
  await render();
  await open();
  expect(w.text()).toContain('20 / 3');
  mocks.aggregate.mockResolvedValue({ entry_id: id, total: 0n, votes: 0n, partial: false });
  w.getComponent(Round).vm.$emit('confirmed');
  await flushPromises();
  expect(w.text()).toContain(messages.en.unrated);
  expect(w.text()).not.toContain('0 / 0');
});
test('route A to B discards stale entries; logout clears private content', async () => {
  const pending = deferred();
  mocks.entries.mockReturnValueOnce(pending.promise);
  await render();
  mocks.entries.mockResolvedValueOnce({ items: [], next_cursor: null });
  await w.setProps({ rankingId: other });
  await flushPromises();
  pending.resolve({ items: [entry], next_cursor: null });
  await flushPromises();
  expect(w.text()).not.toContain('Cinema');
  await w.setProps({ rankingId: id });
  await flushPromises();
  expect(w.text()).toContain('Cinema');
  mocks.user.user.isLoged = false;
  await flushPromises();
  expect(w.text()).not.toContain('Cinema');
});
test('late round response for older selection cannot replace selected entry', async () => {
  mocks.entries.mockResolvedValue({
    items: [entry, { ...entry, entry_id: other, english_title: 'Second' }],
    next_cursor: null,
  });
  const pending = deferred();
  mocks.rounds.mockReturnValueOnce(pending.promise);
  await render();
  await open();
  await w.findAll('.mm-ranking-entry-card')[1]!.trigger('click');
  await flushPromises();
  pending.resolve({ items: [{ ...round, description: 'STALE' }], next_cursor: null });
  await flushPromises();
  expect(w.text()).not.toContain('STALE');
  expect(w.get('.mm-detail-panel h2').text()).toBe('Second');
});
test.each([401, 404])(
  'own read %s clears protected detail rather than retaining stale scores',
  async (status) => {
    await render();
    await open();
    mocks.ownRating.mockRejectedValueOnce({ response: { status } });
    if (status === 404) mocks.summary.mockRejectedValueOnce({ response: { status: 404 } });
    await openRoundIfClosed();
    await readOwn();
    expect(w.find('.mm-detail-panel').exists()).toBe(false);
    expect(w.find('.mm-ranking-entry-card').exists()).toBe(false);
    expect(w.text()).toContain(
      status === 401 ? messages.en.sessionExpired : messages.en.unavailable,
    );
  },
);

test('ambiguous own 404 rechecks access before retaining authorized catalog and never infers missing rating', async () => {
  mocks.summary.mockResolvedValue({
    ranking_id: id,
    name: 'Authorized',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ', 'RATE_OWN'],
  });
  await render();
  await open();
  mocks.ownRating.mockRejectedValueOnce({ response: { status: 404 } });
  await openRound();
  await readOwn();
  expect(mocks.summary).toHaveBeenCalledTimes(2);
  expect(w.find('.mm-ranking-entry-card').exists()).toBe(true);
  expect(w.text()).toContain(messages.en.ownUnavailable);
  expect(w.findComponent({ name: 'RankingOwnRating' }).exists()).toBe(false);
  await openRound();
  expect(w.text()).toContain(enLocale.rankingOwnRating.add);
  w.findComponent({ name: 'RankingOwnRating' }).vm.$emit('confirmed');
  await flushPromises();
  expect(w.text()).not.toContain(messages.en.ownUnavailable);
});

test('zero revealed votes has no partial average and does not imply hidden participation', async () => {
  mocks.aggregate.mockResolvedValue({ entry_id: id, total: 0n, votes: 0n, partial: true });
  await render();
  await open();
  expect(w.text()).toContain(messages.en.unratedPartial);
  expect(w.text()).not.toContain('0 / 0');
  expect(w.text()).not.toContain(messages.en.mean + ':');
});

test.each([
  ['INVITATION', ['READ', 'INVITE_MEMBER'], true],
  ['INVITATION', ['READ'], false],
  ['OPEN', ['READ', 'INVITE_MEMBER'], false],
  ['APPROVAL', ['READ', 'INVITE_MEMBER'], false],
  ['INVITATION', ['INVITE_MEMBER'], false],
] as const)(
  'issuer requires fresh READ and INVITE_MEMBER and invitation admission %s %j',
  async (admission, capabilities, shown) => {
    mocks.summary.mockResolvedValueOnce({
      ranking_id: id,
      name: 'Ranking',
      visibility: 'PRIVATE',
      admission,
      capabilities,
    });
    await render();
    expect(w.findComponent(Issuer).exists()).toBe(shown);
    expect(w.text()).not.toContain(id);
  },
);
test('issuer scope failure clears stale data before auth refresh and never restores missing capability', async () => {
  mocks.summary.mockResolvedValueOnce({
    ranking_id: id,
    name: 'Stale scope name',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ', 'INVITE_MEMBER'],
  });
  await render();
  const current = deferred();
  mocks.summary.mockReturnValueOnce(current.promise);
  w.getComponent(Issuer).vm.$emit('accessLost', 404);
  await flushPromises();
  expect(w.findComponent(Issuer).exists()).toBe(false);
  expect(w.text()).not.toContain('Stale scope name');
  expect(w.text()).toContain(enLocale.rankingInvitationIssuer.unavailable);
  expect(w.text()).not.toContain(enLocale.rankingDetail.ownUnavailable);
  current.resolve({
    ranking_id: id,
    name: 'Revalidated scope',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ'],
  });
  await flushPromises();
  expect(w.text()).toContain('Revalidated scope');
  expect(w.findComponent(Issuer).exists()).toBe(false);
});

test('catalog cards retain focus while selecting contextual entry and update selected state', async () => {
  const second = { ...entry, entry_id: other, english_title: 'Second title', runtime: 96 };
  mocks.entries.mockResolvedValueOnce({ items: [entry, second], next_cursor: null });
  await render('en', document.body);
  const cards = w.findAllComponents(Card);
  expect(cards).toHaveLength(2);
  expect(cards[0]!.get('button').attributes('aria-pressed')).toBe('false');
  const button = cards[1]!.get('button');
  expect(button.text()).toContain('96 min');
  (button.element as HTMLElement).focus();
  await button.trigger('click');
  await flushPromises();
  expect(document.activeElement).toBe(button.element);
  expect(button.attributes('aria-pressed')).toBe('true');
  expect(cards[0]!.get('button').attributes('aria-pressed')).toBe('false');
  expect(mocks.rounds).toHaveBeenLastCalledWith(id, other, undefined, expect.any(AbortSignal));
  expect(w.get('.mm-detail-panel h2').text()).toBe('Second title');
});

test('entry and route interruptions confirm drafts, but block pending requests', async () => {
  mocks.entries.mockResolvedValue({
    items: [entry, { ...entry, entry_id: other, english_title: 'Second' }],
    next_cursor: null,
  });
  await render();
  await open();
  await openRound();
  const panel = w.getComponent(Round);
  const card = w.findAllComponents(Card)[1]!.get('button');
  const dialog = w.getComponent(Confirm);
  panel.vm.$emit('interaction', 'pending');
  await card.trigger('click');
  expect(mocks.leave?.()).toBe(false);
  expect(w.text()).toContain(enLocale.rankingRoundPanel.busy);
  expect(w.get('.mm-detail-panel h2').text()).toBe('Cinema');
  panel.vm.$emit('interaction', 'draft');
  await card.trigger('click');
  dialog.vm.$emit('cancel');
  await flushPromises();
  expect(w.get('.mm-detail-panel h2').text()).toBe('Cinema');
  const leave = mocks.leave?.();
  dialog.vm.$emit('cancel');
  expect(await leave).toBe(false);
  expect(mocks.update?.({ params: { rankingId: id } }, { params: { rankingId: id } })).toBe(true);
  const update = mocks.update?.({ params: { rankingId: other } }, { params: { rankingId: id } });
  dialog.vm.$emit('cancel');
  expect(await update).toBe(false);
  await card.trigger('click');
  dialog.vm.$emit('ok');
  await flushPromises();
  expect(w.get('.mm-detail-panel h2').text()).toBe('Second');
  expect(mocks.roundEnter).toHaveBeenCalledTimes(1);
});
test('only a matched explicit false-to-true transition refreshes entry aggregate, never re-enters round', async () => {
  await render();
  await open();
  const panel = w.getComponent(Round);
  panel.vm.$emit('transitioned', { rankingId: id, entryId: other, roundId: id });
  expect(mocks.aggregate).toHaveBeenCalledTimes(1);
  mocks.roundEnter.mockResolvedValueOnce({ round_id: id, round_number: 1, revealed: true });
  await openRound();
  expect(mocks.aggregate).toHaveBeenCalledTimes(2);
  expect(panel.props('round').revealed).toBe(true);
  panel.vm.$emit('transitioned', { rankingId: id, entryId: id, roundId: id });
  expect(mocks.aggregate).toHaveBeenCalledTimes(2);
  panel.vm.$emit('confirmed');
  expect(mocks.aggregate).toHaveBeenCalledTimes(3);
  expect(mocks.roundEnter).toHaveBeenCalledTimes(1);
  expect(panel.props('round').revealed).toBe(true);
});
test('same-session refresh does not reset selected round or an active draft', async () => {
  await render();
  await open();
  await openRound();
  const panel = w.getComponent(Round);
  panel.vm.$emit('interaction', 'draft');
  mocks.user.user = { generation: 'a', isLoged: true };
  await flushPromises();
  expect(w.findComponent(Round).exists()).toBe(true);
  expect(w.get('.mm-detail-panel h2').text()).toBe('Cinema');
  expect(mocks.roundEnter).toHaveBeenCalledTimes(1);
  const leave = mocks.leave?.();
  w.getComponent(Confirm).vm.$emit('cancel');
  expect(await leave).toBe(false);
});
