import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/public-collection.json';
import pt from '../../i18n/locales/pt-BR/public-collection.json';
const stubs = vi.hoisted(() => ({ summary: vi.fn(), entries: vi.fn() }));
vi.mock('~/core/i18n/LanguageSelector.vue', () => ({ default: { template: '<span />' } }));
vi.mock('../../src/modules/ranking/services/PublicCollectionService', async (original) => ({
  ...(await original<
    typeof import('../../src/modules/ranking/services/PublicCollectionService')
  >()),
  default: stubs,
}));
import View from '../../src/modules/ranking/views/PublicCollectionView.vue';
import { PublicCollectionError } from '../../src/modules/ranking/services/PublicCollectionService';
const rank = 'abcdefab-2222-4222-8222-222222222222',
  second = 'dddddddd-2222-4222-8222-222222222222',
  row = 'cccccccc-2222-4222-8222-222222222222';
const item = { entry_id: row, title: null, total: 0n, votes: 0n };
const summary = { ranking_id: rank, ranking_name: null };
let w: VueWrapper | undefined;
const locales = (locale: string) =>
  createI18n({
    legacy: false,
    locale,
    messages: { en: { publicCollection: en }, 'pt-BR': { publicCollection: pt } },
  });
const view = (id: unknown = rank, language = 'en') => {
  w = mount(View, { props: { rankingId: id }, global: { plugins: [locales(language)] } });
  return w;
};
async function click(label: string) {
  const button = w?.findAll('button').find((b) => b.text() === label);
  if (!button) throw new Error(`Missing ${label}`);
  await button.trigger('click');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  stubs.summary.mockResolvedValue(summary);
  stubs.entries.mockResolvedValue({ items: [item], next_cursor: null });
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('SSR is neutral, contains no ID/title and never fetches', async () => {
  const app = createSSRApp(View, { rankingId: rank });
  app.use(locales('en'));
  const html = await renderToString(app);
  expect(html).toContain(en.title);
  expect(html).not.toContain(rank);
  expect(stubs.summary).not.toHaveBeenCalled();
  expect(stubs.entries).not.toHaveBeenCalled();
});
test.each([
  ['en', en, '3.3'],
  ['pt-BR', pt, '3,3'],
] as const)(
  '%s shows disclosed-only exact/localized averages and neutral fallbacks',
  async (locale, msg, value) => {
    stubs.entries.mockResolvedValueOnce({
      items: [item, { ...item, entry_id: second, title: '<b>Escaped</b>', total: 10n, votes: 3n }],
      next_cursor: null,
    });
    view(rank, locale);
    await flushPromises();
    expect(w!.text()).toContain(msg.unnamed);
    expect(w!.text()).toContain(msg.untitled);
    expect(w!.text()).toContain(msg.noVotes);
    expect(w!.text()).toContain(msg.mean);
    expect(w!.get('strong').text()).toBe(value);
    expect(w!.findAll('.mm-sr-only')).toHaveLength(1);
    expect(w!.get('.mm-sr-only').text()).toContain('10');
    expect(w!.get('.mm-sr-only').text()).toContain('3');
    expect(w!.find('b').exists()).toBe(false);
    expect(w!.find('a').exists()).toBe(false);
    expect(w!.find('form').exists()).toBe(false);
    expect(w!.find('button').exists()).toBe(false);
  },
);
test('known pagination 404 clears previously-visible title, rows and actions', async () => {
  stubs.summary.mockResolvedValueOnce({ ...summary, ranking_name: 'old title' });
  stubs.entries.mockResolvedValueOnce({
    items: [{ ...item, title: 'old movie' }],
    next_cursor: row,
  });
  view();
  await flushPromises();
  expect(w!.text()).toContain('old title');
  stubs.entries.mockRejectedValueOnce(new PublicCollectionError(404));
  await click(en.more);
  expect(w!.text()).toContain(en.unavailable);
  expect(w!.text()).not.toContain('old title');
  expect(w!.text()).not.toContain('old movie');
  expect(stubs.entries).toHaveBeenLastCalledWith(rank, row, expect.any(AbortSignal));
  expect(w!.find('button').exists()).toBe(false);
});
test('invalid scoped id is neutral and does not fetch', async () => {
  view(rank.toUpperCase());
  await flushPromises();
  expect(w!.text()).toContain(en.unavailable);
  expect(stubs.summary).not.toHaveBeenCalled();
  expect(stubs.entries).not.toHaveBeenCalled();
});
test('scope change aborts and discards prior response; no stale page continuation', async () => {
  const pending = Promise.withResolvers<typeof summary>();
  stubs.summary
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ranking_id: second, ranking_name: 'new title' });
  view();
  await w!.setProps({ rankingId: second });
  await flushPromises();
  pending.resolve({ ...summary, ranking_name: 'old title' });
  await flushPromises();
  expect((stubs.summary.mock.calls[0]![1] as AbortSignal).aborted).toBe(true);
  expect(stubs.entries).toHaveBeenCalledExactlyOnceWith(second, null, expect.any(AbortSignal));
  expect(w!.text()).not.toContain('old title');
  expect(w!.text()).toContain('new title');
});
test('bfcache departure discards displayed values; restored navigation checks fresh exposure', async () => {
  stubs.summary.mockResolvedValueOnce({ ...summary, ranking_name: 'old title' });
  view();
  await flushPromises();
  expect(w!.text()).toContain('old title');
  window.dispatchEvent(new PageTransitionEvent('pagehide'));
  await flushPromises();
  expect(w!.text()).not.toContain('old title');
  stubs.summary.mockRejectedValueOnce(new PublicCollectionError(404));
  const restoration = Object.assign(new Event('pageshow'), { persisted: true });
  window.dispatchEvent(restoration);
  await flushPromises();
  expect(w!.text()).toContain(en.unavailable);
  expect(stubs.summary).toHaveBeenCalledTimes(2);
});
