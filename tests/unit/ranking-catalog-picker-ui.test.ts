import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { reactive } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
import type { CatalogPickerLanguage } from '../../src/modules/ranking/services/RankingCatalogPickerService';

const kit = vi.hoisted(() => ({
  search: vi.fn(),
  add: vi.fn(),
  summary: vi.fn(),
  entries: vi.fn(),
  externalSearch: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingCatalogPickerService', async (original) => ({
  ...(await original<object>()),
  default: kit,
}));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({ default: kit }));
vi.mock('../../src/modules/ranking/services/RankingTmdbPickerService', async (original) => ({
  ...(await original<object>()),
  default: { search: kit.externalSearch },
}));
import Picker from '../../src/modules/ranking/components/RankingCatalogPicker.vue';
import Tmdb from '../../src/modules/ranking/components/RankingTmdbPicker.vue';
import { CatalogPickerError } from '../../src/modules/ranking/services/RankingCatalogPickerService';
const rank = '11111111-1111-4111-8111-111111111111';
const movie = '22222222-2222-4222-8222-222222222222';
const entry = '33333333-3333-4333-8333-333333333333';
const nextRank = '44444444-4444-4444-8444-444444444444';
const localTitle = 'Manual <Film>';
const item = { movie_id: movie, title: localTitle, release_date: '2019-01-02' };
const page = { items: [item], page: 1, has_more: false };
const review = 'Title to find';
let view: VueWrapper | undefined;
let currentLocale: ReturnType<typeof lang>;
function lang(locale: string) {
  return createI18n({ legacy: false, locale, messages: { en, 'pt-BR': pt } });
}
function render(providerEnabled = false, locale = 'en') {
  currentLocale = lang(locale);
  view = mount(Picker, {
    props: { rankingId: rank, canAdd: true, providerEnabled },
    global: { plugins: [currentLocale] },
  });
  return view;
}
async function click(label: string) {
  const button = view?.findAll('button').find((item) => item.text() === label);
  if (!button) throw Error(`Missing button ${label}`);
  await button.trigger('click');
  await flushPromises();
}
async function search(messages = en.rankingCatalogPicker) {
  await click(messages.open);
  await view!.get('input').setValue(` ${review} `);
  await view!.get('form').trigger('submit');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.search.mockResolvedValue(page);
  kit.add.mockResolvedValue({ entryId: entry, disposition: 'new' });
  kit.summary.mockResolvedValue({ capabilities: ['READ', 'ADD_ENTRY'] });
  kit.entries.mockResolvedValue({ items: [], next_cursor: null });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
});

test.each(['en', 'pt-BR'])(
  'existing manual title is found and explicitly attached with provider disabled (%s)',
  async (locale) => {
    const words = (locale === 'en' ? en : pt).rankingCatalogPicker;
    const lang: CatalogPickerLanguage = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
    const panel = render(false, locale);
    expect(kit.search).not.toHaveBeenCalled();
    await search(words);
    expect(kit.search).toHaveBeenCalledExactlyOnceWith(
      rank,
      review,
      1,
      lang,
      expect.any(AbortSignal),
    );
    expect(panel.text()).toContain(localTitle);
    expect(panel.html()).toContain('&lt;Film&gt;');
    expect(panel.text()).toContain(words.providerDisabled);
    expect(panel.findComponent(Tmdb).exists()).toBe(false);
    expect(kit.add).not.toHaveBeenCalled();
    await click(words.add);
    expect(kit.add).toHaveBeenCalledExactlyOnceWith(rank, movie);
    expect(panel.emitted('imported')).toEqual([
      [{ rankingId: rank, entryId: entry, disposition: 'new' }],
    ]);
    expect(kit.externalSearch).not.toHaveBeenCalled();
  },
);
test('internal failure is not a miss; external option only appears after successful exact reviewed query', async () => {
  const words = en.rankingCatalogPicker;
  const panel = render(true);
  kit.search.mockRejectedValueOnce(new Error('provider internal error'));
  await search();
  expect(panel.text()).toContain(words.searchError);
  expect(panel.text()).not.toContain(words.provider);
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
  expect(kit.externalSearch).not.toHaveBeenCalled();
  kit.search.mockResolvedValueOnce({ ...page, items: [] });
  await panel.get('form').trigger('submit');
  await flushPromises();
  expect(panel.text()).toContain(words.empty);
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
  await click(words.provider);
  expect(panel.getComponent(Tmdb).props('fixedQuery')).toBe(review);
  expect(kit.externalSearch).not.toHaveBeenCalled();
});
test('reviewed none-of-these fallback remains explicit for nonempty result; edit invalidates eligibility', async () => {
  const words = en.rankingCatalogPicker;
  const panel = render(true);
  await search();
  expect(panel.text()).toContain(words.noMatchProvider);
  await panel.get('input').setValue('Different title');
  expect(panel.text()).not.toContain(words.noMatchProvider);
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
  expect(kit.externalSearch).not.toHaveBeenCalled();
});
test('unknown attach demands exact scoped reconciliation, never remaps or auto retries', async () => {
  const words = en.rankingCatalogPicker;
  const panel = render(true);
  await search();
  kit.add.mockRejectedValueOnce(new Error('timeout'));
  await click(words.add);
  expect(panel.text()).toContain(words.uncertain);
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
  expect(panel.text()).not.toContain(words.retrySame);
  expect(kit.summary).not.toHaveBeenCalled();
  await click(words.check);
  expect(kit.summary).toHaveBeenCalledExactlyOnceWith(rank, expect.any(AbortSignal));
  expect(panel.text()).toContain(words.notConfirmed);
  expect(kit.add).toHaveBeenCalledTimes(1);
  await click(words.retrySame);
  expect(kit.add.mock.calls).toEqual([
    [rank, movie],
    [rank, movie],
  ]);
});
test('fresh authorization denial clears results and emits scope loss without external fallback', async () => {
  const words = en.rankingCatalogPicker;
  const panel = render(true);
  await search();
  kit.add.mockRejectedValueOnce(new CatalogPickerError(404, 'ranking.not_found'));
  await click(words.add);
  expect(panel.emitted('scopeLost')).toEqual([[404]]);
  expect(panel.text()).not.toContain(localTitle);
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
});
test('late search response cannot open another collection after scope switch', async () => {
  const panel = render(true);
  const pending = Promise.withResolvers<typeof page>();
  kit.search.mockReturnValueOnce(pending.promise);
  await search();
  const signal = kit.search.mock.calls[0]?.[4] as AbortSignal;
  await panel.setProps({ rankingId: nextRank });
  expect(signal.aborted).toBe(true);
  pending.resolve(page);
  await flushPromises();
  expect(panel.text()).not.toContain(localTitle);
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
});

test('a failed new reconciliation invalidates any earlier catalog same-ID retry', async () => {
  const words = en.rankingCatalogPicker;
  const panel = render();
  await search();
  kit.add.mockRejectedValueOnce(new Error('timeout'));
  await click(words.add);
  await click(words.check);
  expect(panel.text()).toContain(words.retrySame);
  kit.summary.mockRejectedValueOnce(new Error('fresh request failed'));
  await click(words.check);
  expect(panel.text()).toContain(words.recheckError);
  expect(panel.text()).not.toContain(words.retrySame);
  expect(kit.add).toHaveBeenCalledTimes(1);
});

test('locale changed during a pending provider write requires new catalog search after settlement', async () => {
  const panel = render(true);
  kit.search.mockResolvedValueOnce({ ...page, items: [] });
  await search();
  await click(en.rankingCatalogPicker.provider);
  panel.getComponent(Tmdb).vm.$emit('interaction', 'pending');
  currentLocale.global.locale.value = 'pt-BR';
  await flushPromises();
  expect(panel.findComponent(Tmdb).exists()).toBe(true);
  panel.getComponent(Tmdb).vm.$emit('interaction', 'draft');
  await flushPromises();
  expect(panel.findComponent(Tmdb).exists()).toBe(false);
  expect(panel.text()).not.toContain(pt.rankingCatalogPicker.provider);
  expect(kit.search).toHaveBeenCalledTimes(1);
  expect(kit.externalSearch).not.toHaveBeenCalled();
});
