import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { reactive } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
const msgs = { en: en.rankingTmdbPicker, 'pt-BR': pt.rankingTmdbPicker };
const kit = vi.hoisted(() => ({
  search: vi.fn(),
  add: vi.fn(),
  summary: vi.fn(),
  entries: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://fixture.test/t/p' } }),
}));
vi.mock('../../src/modules/ranking/services/RankingTmdbPickerService', async (original) => ({
  ...(await original<
    typeof import('../../src/modules/ranking/services/RankingTmdbPickerService')
  >()),
  default: kit,
}));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({ default: kit }));
import Picker from '../../src/modules/ranking/components/RankingTmdbPicker.vue';
const rank = '11111111-1111-4111-8111-111111111111',
  entry = '22222222-2222-4222-8222-222222222222';
const item = {
  tmdb_id: 13,
  title: '<b>Movie</b>',
  original_title: null,
  release_date: '2024-01-23',
  poster_path: '/safe.jpg',
};
const page = { items: [item], page: 1, has_more: true };
let w: VueWrapper | undefined;
let i18n: ReturnType<typeof makeI18n>;
function makeI18n(locale: string) {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      en: { ...en, rankingTmdbPicker: msgs.en },
      'pt-BR': { ...pt, rankingTmdbPicker: msgs['pt-BR'] },
    },
  });
}
function view(props: { enabled?: boolean; canAdd?: boolean } = { enabled: true }, locale = 'en') {
  i18n = makeI18n(locale);
  w = mount(Picker, {
    props: { rankingId: rank, canAdd: true, ...props },
    global: { plugins: [i18n] },
  });
  return w;
}
async function click(label: string) {
  const button = w?.findAll('button').find((b) => b.text() === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await button.trigger('click');
  await flushPromises();
}
async function search(label = msgs.en.open, value = 'Movie') {
  await click(label);
  await w!.get('input').setValue(value);
  await w!.get('form').trigger('submit');
  await flushPromises();
}
function pending<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.search.mockResolvedValue(page);
  kit.add.mockResolvedValue({ entryId: entry, disposition: 'new' });
  kit.summary.mockResolvedValue({ capabilities: ['READ', 'ADD_ENTRY'] });
  kit.entries.mockResolvedValue({ items: [], next_cursor: 'another-page' });
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('gated default and explicit search/import, no IDs or navigation and only safe poster', async () => {
  view({});
  expect(w!.text()).toContain(msgs.en.disabled);
  expect(kit.search).not.toHaveBeenCalled();
  await w!.setProps({ enabled: true });
  await click(msgs.en.open);
  await w!.get('input').setValue(' Movie ');
  expect(kit.search).not.toHaveBeenCalled();
  await w!.get('form').trigger('submit');
  await flushPromises();
  expect(kit.search).toHaveBeenCalledWith(rank, 'Movie', 1, 'en-US', true, expect.any(AbortSignal));
  expect(w!.find('a').exists()).toBe(false);
  expect(w!.find('b').exists()).toBe(false);
  expect(w!.text()).toContain(item.title);
  expect(w!.get('img').attributes('src')).toBe('https://fixture.test/t/p/w185/safe.jpg');
  expect(kit.add).not.toHaveBeenCalled();
  await click(msgs.en.add);
  expect(kit.add.mock.calls).toEqual([[rank, 13, true]]);
  expect(w!.emitted('imported')).toEqual([
    [{ rankingId: rank, entryId: entry, disposition: 'new' }],
  ]);
});
test('new query, locale change and dismissal abort stale search without requests', async () => {
  const late = pending<typeof page>();
  kit.search.mockReturnValueOnce(late.promise);
  view();
  await search();
  await w!.get('input').setValue('changed');
  expect((kit.search.mock.calls[0]![5] as AbortSignal).aborted).toBe(true);
  late.resolve(page);
  await flushPromises();
  expect(w!.find('img').exists()).toBe(false);
  await w!.get('form').trigger('submit');
  await flushPromises();
  expect(w!.find('img').exists()).toBe(true);
  i18n.global.locale.value = 'pt-BR';
  await flushPromises();
  expect(w!.find('img').exists()).toBe(false);
  await w!.get('form').trigger('submit');
  await flushPromises();
  expect(kit.search.mock.calls[2]![3]).toBe('pt-BR');
  await click(msgs['pt-BR'].close);
  expect(w!.find('input').exists()).toBe(false);
  expect(kit.search).toHaveBeenCalledTimes(3);
  expect(kit.add).not.toHaveBeenCalled();
});
test('uncertain import requires explicit authorized refetch, never infer first-page absence or auto-retry', async () => {
  kit.add.mockRejectedValueOnce(new Error('unknown'));
  view();
  await search();
  await click(msgs.en.add);
  expect(w!.text()).toContain(msgs.en.uncertain);
  expect(kit.summary).not.toHaveBeenCalled();
  expect(w!.findAll('button').every((b) => b.text() !== msgs.en.retryImport)).toBe(true);
  await click(msgs.en.check);
  expect(kit.summary).toHaveBeenCalledWith(rank, expect.any(AbortSignal));
  expect(kit.entries).toHaveBeenCalledWith(rank, undefined, expect.any(AbortSignal));
  expect(w!.text()).toContain(msgs.en.unconfirmedAfterCheck);
  expect(w!.emitted('imported')).toBeUndefined();
  expect(kit.add).toHaveBeenCalledTimes(1);
  await click(msgs.en.retryImport);
  expect(kit.add).toHaveBeenLastCalledWith(rank, 13, true);
});
test('scoped positive reconciliation emits verified entry without mutation', async () => {
  kit.add.mockRejectedValueOnce(new Error('network'));
  kit.entries.mockResolvedValueOnce({
    items: [{ tmdb_id: 13, entry_id: entry }],
    next_cursor: null,
  });
  view();
  await search();
  await click(msgs.en.add);
  await click(msgs.en.check);
  expect(w!.emitted('imported')).toEqual([
    [{ rankingId: rank, entryId: entry, disposition: 'verified' }],
  ]);
  expect(kit.add).toHaveBeenCalledTimes(1);
});
test('reconciliation is fail-closed for lost access and does not read catalog', async () => {
  kit.add.mockRejectedValueOnce(new Error('network'));
  kit.summary.mockResolvedValueOnce({ capabilities: ['READ'] });
  view();
  await search();
  await click(msgs.en.add);
  await click(msgs.en.check);
  expect(kit.entries).not.toHaveBeenCalled();
  expect(kit.add).toHaveBeenCalledTimes(1);
  expect(w!.emitted('scopeLost')).toEqual([[403]]);
});
test('pending import cannot submit twice and late session result cannot emit', async () => {
  const write = pending<{ entryId: string; disposition: string }>();
  kit.add.mockReturnValueOnce(write.promise);
  view();
  await search();
  const b = w!.findAll('button').find((b) => b.text() === msgs.en.add)!;
  const a = b.trigger('click');
  await b.trigger('click');
  await a;
  expect(kit.add).toHaveBeenCalledTimes(1);
  kit.user!.user.generation = 'b';
  write.resolve({ entryId: entry, disposition: 'new' });
  await flushPromises();
  expect(w!.emitted('imported')).toBeUndefined();
  expect(w!.find('input').exists()).toBe(false);
});
test('backend gating mismatch, empty search and provider failure remain distinct localized states', async () => {
  view();
  kit.search.mockRejectedValueOnce({
    response: { status: 503, data: { data: { code: 'ranking.tmdb_import_unavailable' } } },
  });
  await search();
  expect(w!.text()).toContain(msgs.en.disabled);
  kit.search.mockResolvedValueOnce({ items: [], page: 1, has_more: false });
  await w!.get('form').trigger('submit');
  await flushPromises();
  expect(w!.text()).toContain(msgs.en.empty);
  kit.search.mockRejectedValueOnce({
    response: {
      status: 502,
      data: { data: { code: 'ranking.tmdb_invalid_response' }, trace: 'private' },
    },
  });
  await w!.get('form').trigger('submit');
  await flushPromises();
  expect(w!.text()).toContain(msgs.en.providerError);
  expect(w!.text()).not.toContain('private');
});

test('pending mutation blocks close; uncertainty survives close and retry requires another fresh check', async () => {
  const result = Promise.withResolvers<{ entryId: string; disposition: string }>();
  kit.add.mockReturnValueOnce(result.promise);
  view();
  await search();
  await click(msgs.en.add);
  const close = w!.findAll('button').find((b) => b.text() === msgs.en.close)!;
  expect(close.attributes()).toHaveProperty('disabled');
  expect(w!.emitted('interaction')?.at(-1)).toEqual(['pending']);
  result.reject(new Error('ambiguous'));
  await flushPromises();
  expect(w!.emitted('interaction')?.at(-1)).toEqual(['uncertain']);
  await click(msgs.en.check);
  expect(w!.text()).toContain(msgs.en.retryImport);
  await click(msgs.en.close);
  expect(w!.emitted('interaction')?.at(-1)).toEqual(['uncertain']);
  await click(msgs.en.open);
  expect(w!.text()).toContain(msgs.en.uncertain);
  expect(w!.text()).not.toContain(msgs.en.retryImport);
  expect(kit.add).toHaveBeenCalledTimes(1);
});
