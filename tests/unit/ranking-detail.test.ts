import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '../../i18n/locales/en/ranking-detail.json';
import pt from '../../i18n/locales/pt-BR/ranking-detail.json';
import enLocale from '../../i18n/locales/en';
import ptLocale from '../../i18n/locales/pt-BR';
import Issuer from '../../src/modules/ranking/components/RankingInvitationIssuer.vue';
const messages = { en, 'pt-BR': pt };
const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  entries: vi.fn(),
  rounds: vi.fn(),
  aggregate: vi.fn(),
  ownRating: vi.fn(),
  user: null as any,
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
async function render(locale = 'en') {
  w = mount(View, {
    props: { rankingId: id },
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
async function open() {
  await w.get('.mm-detail-entry').trigger('click');
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
});
afterEach(() => w?.unmount());
test.each(['en', 'pt-BR'])(
  'localized rounds preserve user text and label disclosed subtotal %s',
  async (locale) => {
    await render(locale);
    await open();
    expect(w.text()).toContain(locale === 'en' ? 'Round 1' : 'Rodada 1');
    expect(w.text()).toContain('User description');
    expect(w.text()).toContain('9007199254740993 / 3');
    expect(w.text()).toContain(
      locale === 'en' ? messages.en.partialMean : messages['pt-BR'].partialMean,
    );
    expect(w.text()).not.toContain(
      locale === 'en' ? messages.en.mean + ':' : messages['pt-BR'].mean + ':',
    );
    expect(mocks.ownRating).not.toHaveBeenCalled();
    await w.get('.mm-detail-rounds button').trigger('click');
    await flushPromises();
    expect(w.text()).toContain(`${locale === 'en' ? 'My rating' : 'Minha nota'}: 0`);
  },
);
test('full unequal-size aggregate displays exact ratio, zero votes not zero mean', async () => {
  mocks.aggregate.mockResolvedValue({ entry_id: id, total: 20n, votes: 3n, partial: false });
  await render();
  await open();
  expect(w.text()).toContain('20 / 3');
  mocks.aggregate.mockResolvedValue({ entry_id: id, total: 0n, votes: 0n, partial: false });
  await open();
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
  await w.findAll('.mm-detail-entry')[1]!.trigger('click');
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
    await w.get('.mm-detail-rounds button').trigger('click');
    await flushPromises();
    expect(w.find('.mm-detail-panel').exists()).toBe(false);
    expect(w.find('.mm-detail-entry').exists()).toBe(false);
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
  await w.get('.mm-detail-rounds button').trigger('click');
  await flushPromises();
  expect(mocks.summary).toHaveBeenCalledTimes(2);
  expect(w.find('.mm-detail-entry').exists()).toBe(true);
  expect(w.text()).toContain(messages.en.ownUnavailable);
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
