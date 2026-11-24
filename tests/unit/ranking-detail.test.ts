import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '../../i18n/locales/en/ranking-detail.json';
import pt from '../../i18n/locales/pt-BR/ranking-detail.json';
import enLocale from '../../i18n/locales/en';
import ptLocale from '../../i18n/locales/pt-BR';
import Picker from '../../src/modules/ranking/components/RankingCatalogPicker.vue';
import Round from '../../src/modules/ranking/components/RankingRoundPanel.vue';
import Confirm from '../../src/core/components/BaseConfirmDialog.vue';
import Card from '../../src/modules/ranking/components/RankingEntryCard.vue';
import Visibility from '../../src/modules/ranking/components/RankingVisibilitySettings.vue';
import Issuer from '../../src/modules/ranking/components/RankingInvitationIssuer.vue';
const messages = { en, 'pt-BR': pt };
const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  recoveries: vi.fn(),
  visibilitySettings: vi.fn(),
  visibilitySave: vi.fn(),
  repeatSettings: vi.fn(),
  repeatCreate: vi.fn(),
  repeatSet: vi.fn(),
  entries: vi.fn(),
  rounds: vi.fn(),
  aggregate: vi.fn(),
  ownRating: vi.fn(),
  roundEnter: vi.fn(),
  pickerEnabled: false,
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
vi.mock('#imports', async (original) => {
  const actual = await original<typeof import('#imports')>();
  return {
    ...actual,
    useRuntimeConfig: () => {
      const config = actual.useRuntimeConfig();
      return {
        ...config,
        public: { ...config.public, rankingTmdbPickerEnabled: mocks.pickerEnabled },
      };
    },
  };
});
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  onBeforeRouteLeave: (handler: NonNullable<typeof mocks.leave>) => {
    mocks.leave = handler;
  },
  onBeforeRouteUpdate: (handler: NonNullable<typeof mocks.update>) => {
    mocks.update = handler;
  },
}));
vi.mock('../../src/modules/ranking/services/RankingEntryRecoveryService', async (original) => ({
  ...(await original<object>()),
  default: { list: mocks.recoveries },
}));
vi.mock('../../src/modules/ranking/services/RankingOwnerRosterService', async (original) => ({
  ...(await original<object>()),
  default: { list: vi.fn().mockResolvedValue({ items: [], next_cursor: null }) },
}));
vi.mock('../../src/modules/ranking/services/RankingRoundService', () => ({
  default: { enter: mocks.roundEnter, aggregate: mocks.roundAggregate },
}));
vi.mock('../../src/modules/ranking/services/RankingRepeatedRoundService', () => ({
  default: {
    settings: mocks.repeatSettings,
    create: mocks.repeatCreate,
    setSettings: mocks.repeatSet,
  },
}));
vi.mock('../../src/modules/ranking/services/RankingVisibilityService', () => ({
  default: { settings: mocks.visibilitySettings, save: mocks.visibilitySave },
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
  mocks.pickerEnabled = false;
  mocks.visibilitySettings.mockReset().mockRejectedValue({ response: { status: 404 } });
  mocks.visibilitySave.mockReset();
  mocks.repeatSettings.mockReset().mockRejectedValue({ response: { status: 404 } });
  mocks.repeatCreate.mockReset();
  mocks.repeatSet.mockReset();
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

function usablePicker() {
  mocks.summary.mockResolvedValue({
    ranking_id: id,
    name: 'Authorized ranking',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ', 'ADD_ENTRY'],
  });
}
test('internal catalog stays available with ADD and READ when the TMDB fallback is off', async () => {
  usablePicker();
  await render();
  expect(w.getComponent(Picker).props('providerEnabled')).toBe(false);
  expect(w.text()).toContain(enLocale.rankingCatalogPicker.open);
  expect(w.text()).not.toContain(enLocale.rankingTmdbPicker.open);
});
test('confirmed import refreshes only current ranked catalog, never selects or reveals an entry', async () => {
  usablePicker();
  mocks.pickerEnabled = true;
  await render();
  const picker = w.getComponent(Picker);
  expect(picker.props('providerEnabled')).toBe(true);
  const count = mocks.entries.mock.calls.length;
  picker.vm.$emit('imported', { rankingId: other, entryId: other, disposition: 'new' });
  expect(mocks.entries).toHaveBeenCalledTimes(count);
  picker.vm.$emit('imported', { rankingId: id, entryId: other, disposition: 'verified' });
  await flushPromises();
  expect(mocks.entries).toHaveBeenCalledTimes(count + 1);
  expect(mocks.entries).toHaveBeenLastCalledWith(id, undefined, expect.any(AbortSignal));
  expect(mocks.rounds).not.toHaveBeenCalled();
  expect(mocks.roundEnter).not.toHaveBeenCalled();
  expect(mocks.ownRating).not.toHaveBeenCalled();
  expect(w.find('.mm-detail-panel').exists()).toBe(false);
});
test('pending import prevents switching; uncertain prompt is explicit and cancel retains picker', async () => {
  usablePicker();
  mocks.pickerEnabled = true;
  await render();
  const picker = w.getComponent(Picker),
    dialog = w.getComponent(Confirm);
  const entryButton = w.getComponent(Card).get('button');
  picker.vm.$emit('interaction', 'pending');
  await entryButton.trigger('click');
  expect(mocks.leave?.()).toBe(false);
  expect(w.text()).toContain(enLocale.rankingTmdbPicker.busyLeave);
  expect(mocks.rounds).not.toHaveBeenCalled();
  picker.vm.$emit('interaction', 'uncertain');
  await entryButton.trigger('click');
  await flushPromises();
  expect(w.text()).toContain(enLocale.rankingTmdbPicker.uncertainLeaveHint);
  dialog.vm.$emit('cancel');
  await flushPromises();
  expect(w.getComponent(Picker).element).toBe(picker.element);
  expect(mocks.rounds).not.toHaveBeenCalled();
  await entryButton.trigger('click');
  dialog.vm.$emit('ok');
  await flushPromises();
  expect(w.getComponent(Picker).element).not.toBe(picker.element);
  expect(mocks.rounds).toHaveBeenCalledTimes(1);
  expect(mocks.roundEnter).not.toHaveBeenCalled();
});
test('scope denial clears picker then refetches; absent capability remains unavailable', async () => {
  usablePicker();
  mocks.pickerEnabled = true;
  await render();
  const pending = deferred();
  mocks.summary.mockReturnValueOnce(pending.promise);
  w.getComponent(Picker).vm.$emit('scopeLost', 403);
  await flushPromises();
  expect(w.findComponent(Picker).exists()).toBe(false);
  pending.resolve({
    ranking_id: id,
    name: 'Current ranking',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ'],
  });
  await flushPromises();
  expect(w.text()).toContain(enLocale.rankingTmdbPicker.unavailable);
  expect(w.findComponent(Picker).exists()).toBe(false);
  expect(mocks.rounds).not.toHaveBeenCalled();
});

test.each([undefined, false, 'true'])(
  'does not infer an OPEN owner from complete grants without exact true (%s)',
  async (proof) => {
    mocks.summary.mockResolvedValue({
      ranking_id: id,
      name: 'Collection',
      visibility: 'PRIVATE',
      admission: 'OPEN',
      capabilities: ['READ', 'ADD_ENTRY', 'INVITE_MEMBER', 'MANAGE_MEMBERS', 'RATE_OWN'],
      can_share_open_link: proof,
    });
    await render();
    expect(w.text()).not.toContain('Copy collection join link');
  },
);

test('copies the neutral same-origin link only after an explicit owner click', async () => {
  mocks.summary.mockResolvedValue({
    ranking_id: id,
    name: 'Private title',
    visibility: 'PRIVATE',
    admission: 'OPEN',
    capabilities: ['READ'],
    can_share_open_link: true,
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  try {
    await render('pt-BR');
    expect(writeText).not.toHaveBeenCalled();
    const copy = w.findAll('button').find((b) => b.text() === 'Copiar link de entrada na coleção');
    expect(copy).toBeDefined();
    await copy!.trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      new URL(`/movies/collections/${id}/join`, window.location.origin).href,
    );
    expect(w.text()).toContain('Link de entrada copiado.');
    mocks.user.user.isLoged = false;
    await flushPromises();
    expect(w.text()).not.toContain('Copiar link de entrada na coleção');
  } finally {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  }
});

test('uses scoped repeat settings, not the OPEN share proof, to admit an explicit new round', async () => {
  const createdRound = { roundId: other, ordinal: 2n, replayed: false };
  mocks.repeatSettings.mockResolvedValue(true);
  mocks.repeatCreate.mockResolvedValue(createdRound);
  mocks.rounds.mockResolvedValueOnce({ items: [round], next_cursor: null });
  mocks.rounds.mockResolvedValueOnce({
    items: [
      round,
      { ...round, round_id: other, number: 2, description: 'Repeat reason', revealed: null },
    ],
    next_cursor: null,
  });
  await render();
  expect(mocks.repeatSettings).toHaveBeenCalledWith(id, expect.any(AbortSignal));
  await open();
  expect(mocks.repeatCreate).not.toHaveBeenCalled();
  const launch = w.findAll('button').find((b) => b.text() === 'Add another round');
  expect(launch).toBeDefined();
  await launch!.trigger('click');
  await w.get('textarea').setValue('  Repeat reason  ');
  await w.get('form.mm-new-round-form').trigger('submit');
  await flushPromises();
  expect(mocks.repeatCreate).toHaveBeenCalledTimes(1);
  expect(mocks.repeatCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      rankingId: id,
      entryId: id,
      description: 'Repeat reason',
      commandId: expect.any(String),
    }),
  );
  expect(mocks.rounds).toHaveBeenCalledTimes(2);
  expect(mocks.roundEnter).not.toHaveBeenCalled();
  expect(w.text()).toContain('Round 2 created.');
});

test('an OPEN share proof never substitutes for denied settings authority', async () => {
  mocks.summary.mockResolvedValue({
    ranking_id: id,
    name: 'Owner',
    visibility: 'PRIVATE',
    admission: 'OPEN',
    capabilities: ['READ'],
    can_share_open_link: true,
  });
  await render();
  await open();
  expect(w.text()).toContain('Copy collection join link');
  expect(w.text()).not.toContain('Enable repeated rounds');
  expect(w.text()).not.toContain('Add another round');
});

test('visibility changes block navigation while saving but do not grant other owner controls', async () => {
  mocks.visibilitySettings.mockResolvedValue('PRIVATE');
  await render();
  const control = w.getComponent(Visibility);
  expect(mocks.visibilitySettings).toHaveBeenCalledWith(id, expect.any(AbortSignal));
  expect(w.text()).not.toContain('Copy collection join link');
  control.vm.$emit('interaction', 'pending');
  await flushPromises();
  expect(mocks.leave?.()).toBe(false);
  await flushPromises();
  expect(w.text()).toContain('Wait for the visibility update to finish.');
  control.vm.$emit('interaction', 'idle');
  await flushPromises();
  expect(mocks.leave?.()).toBe(true);
});

test('narrowed grants clear a same-collection directory and ignore the old pending list', async () => {
  const initial = {
    ranking_id: id,
    name: 'Authorized collection',
    visibility: 'PRIVATE',
    admission: 'INVITATION',
    capabilities: ['READ', 'REMOVE_ENTRY'],
  };
  mocks.summary.mockResolvedValue(initial);
  mocks.entries.mockResolvedValue({ items: [entry], next_cursor: other });
  const pending = deferred();
  mocks.recoveries
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue({ items: [], next_cursor: null });
  await render();
  async function click(label: string) {
    const button = w.findAll('button').find((candidate) => candidate.text() === label);
    if (!button) throw new Error(`Missing button ${label}`);
    await button.trigger('click');
    await flushPromises();
  }
  await click(enLocale.rankingEntryRecovery.open);
  const request = mocks.recoveries.mock.calls[0]?.[2] as AbortSignal;
  mocks.summary.mockResolvedValue({ ...initial, capabilities: ['READ', 'REMOVE_OWN_ENTRY'] });
  await click(en.more);
  expect(request.aborted).toBe(true);
  pending.resolve({
    items: [{ entry_id: other, title: 'Previous broader private result' }],
    next_cursor: null,
  });
  await flushPromises();
  expect(w.text()).not.toContain('Previous broader private result');
  await click(enLocale.rankingEntryRecovery.open);
  expect(w.text()).toContain(enLocale.rankingEntryRecovery.empty);
});

test.each(['en', 'pt-BR'])(
  'authorized approval detail remains readable with no request action (%s)',
  async (locale) => {
    const labels = (locale === 'en' ? enLocale : ptLocale).rankings;
    mocks.summary.mockResolvedValue({
      ranking_id: id,
      name: 'Existing collection',
      visibility: 'PRIVATE',
      admission: 'APPROVAL',
      capabilities: ['READ'],
    });
    const page = await render(locale);
    expect(page.get('h1').text()).toBe('Existing collection');
    expect(page.text()).toContain(labels.admission.APPROVAL);
    expect(page.text()).toContain(labels.approvalRequestsUnavailable);
    expect(page.findComponent(Issuer).exists()).toBe(false);
    expect(page.find('.mm-ranking-entry-card').exists()).toBe(true);
    mocks.user.user.isLoged = false;
    await flushPromises();
    expect(page.text()).not.toContain(labels.approvalRequestsUnavailable);
  },
);

test('ADD without READ does not open a collection picker or leak its title', async () => {
  mocks.summary.mockRejectedValueOnce({ response: { status: 404 } });
  const page = await render();
  expect(page.findComponent(Picker).exists()).toBe(false);
  expect(mocks.entries).not.toHaveBeenCalled();
  expect(page.text()).not.toContain('Authorized ranking');
});
