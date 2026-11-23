import { reactive } from 'vue';
import { createI18n } from 'vue-i18n';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
import RatingCopy from '../../src/modules/ranking/components/RankingRatingCopy.vue';
const kit = vi.hoisted(() => ({
  list: vi.fn(),
  entries: vi.fn(),
  rounds: vi.fn(),
  ownRating: vi.fn(),
  preview: vi.fn(),
  apply: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingService', () => ({
  default: { list: kit.list },
}));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({
  default: { entries: kit.entries, rounds: kit.rounds, ownRating: kit.ownRating },
}));
vi.mock('../../src/modules/ranking/services/RankingRatingCopyService', () => ({
  default: { preview: kit.preview, apply: kit.apply },
  RankingRatingCopyError: class extends Error {},
}));
const destination = {
  rankingId: 'destination',
  entryId: 'entry-destination',
  roundId: 'round-destination',
};
const source = { rankingId: 'source', entryId: 'entry-source', roundId: 'round-source' };
const movie = 'same-movie';
const token = 'fixture-opaque-token';
let view: VueWrapper;
let expiry: string;
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'one', isLoged: true } });
  kit.list.mockResolvedValue({
    items: [
      { ranking_id: 'destination', name: 'Destination', capabilities: ['READ'] },
      { ranking_id: 'source', name: 'Source', capabilities: ['READ'] },
      { ranking_id: 'not-readable', name: 'Unreadable', capabilities: [] },
    ],
    next_cursor: null,
  });
  kit.entries.mockResolvedValue({
    items: [
      { entry_id: 'wrong-entry', movie_id: 'different' },
      { entry_id: 'entry-source', movie_id: movie },
    ],
    next_cursor: null,
  });
  kit.rounds.mockResolvedValue({
    items: [{ round_id: 'round-source', number: 2, description: null }],
    next_cursor: null,
  });
  expiry = new Date(Date.now() + 60_000).toISOString();
  kit.preview.mockResolvedValue({
    status: 'READY',
    source_score: 8,
    preview_token: token,
    expires_at: expiry,
  });
  kit.apply.mockResolvedValue({ round_id: 'round-destination', score: 8 });
  kit.ownRating.mockResolvedValue({ round_id: 'round-destination', score: 10 });
});
afterEach(() => {
  view?.unmount();
});
function render(locale = 'en', blocked = false) {
  view = mount(RatingCopy, {
    props: { destination, movieId: movie, blocked },
    global: { plugins: [createI18n({ legacy: false, locale, messages: { en, 'pt-BR': pt } })] },
  });
}
async function click(name: string) {
  const button = view.findAll('button').find((x) => x.text() === name);
  expect(button).toBeDefined();
  await button!.trigger('click');
  await flushPromises();
}
async function ready() {
  await click(en.rankingRatingCopy.open);
  await click('Source');
  await click('Round 2');
}
test('offers literal scoped source selection, explicit preview, and confirms once before refetching the current note', async () => {
  render();
  expect(kit.list).not.toHaveBeenCalled();
  await ready();
  expect(view.text()).not.toContain('Unreadable');
  expect(view.text()).not.toContain('Destination');
  expect(view.html()).not.toContain(token);
  expect(kit.preview).toHaveBeenCalledWith(destination, source, expect.any(AbortSignal));
  expect(kit.apply).not.toHaveBeenCalled();
  expect(kit.ownRating).not.toHaveBeenCalled();
  await click(en.rankingRatingCopy.confirm);
  expect(kit.apply).toHaveBeenCalledExactlyOnceWith(destination, token);
  expect(kit.ownRating).toHaveBeenCalledExactlyOnceWith(
    'destination',
    'round-destination',
    expect.any(AbortSignal),
  );
  expect(view.text()).toContain('Your current rating: 10.');
  expect(view.emitted('confirmed')).toHaveLength(1);
});
test('does not copy on close, selecting a source, or an unavailable preview', async () => {
  kit.preview.mockResolvedValue({
    status: 'SOURCE_INELIGIBLE',
    source_score: null,
    preview_token: null,
    expires_at: null,
  });
  render();
  await ready();
  expect(view.text()).toContain(en.rankingRatingCopy.sourceUnavailable);
  expect(view.text()).not.toContain(en.rankingRatingCopy.confirm);
  await click(en.rankingRatingCopy.close);
  expect(kit.apply).not.toHaveBeenCalled();
});
test('does not use a false visible success or claims absence if write or own GET is uncertain', async () => {
  render();
  await ready();
  kit.apply.mockRejectedValue(new Error('no receipt'));
  kit.ownRating.mockRejectedValue({ response: { status: 404 } });
  await click(en.rankingRatingCopy.confirm);
  expect(view.text()).toContain(en.rankingRatingCopy.uncertain);
  expect(view.text()).not.toContain(en.rankingRatingCopy.copied);
  expect(view.text()).not.toContain(en.rankingRatingCopy.confirm);
  expect(view.text()).toContain(en.rankingRatingCopy.unverified);
  await click(en.rankingRatingCopy.check);
  expect(kit.apply).toHaveBeenCalledTimes(1);
  expect(kit.ownRating).toHaveBeenCalledTimes(2);
  expect(view.emitted('confirmed')).toBeUndefined();
});
test('rejects expired previews locally and ignores a late receipt after session change', async () => {
  kit.preview.mockResolvedValueOnce({
    status: 'READY',
    source_score: 8,
    preview_token: token,
    expires_at: new Date(0).toISOString(),
  });
  render();
  await ready();
  expect(view.text()).toContain(en.rankingRatingCopy.stale);
  expect(view.text()).not.toContain(en.rankingRatingCopy.confirm);
  await click('Round 2');
  let resolve!: (x: unknown) => void;
  kit.apply.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await view
    .findAll('button')
    .find((b) => b.text() === en.rankingRatingCopy.confirm)!
    .trigger('click');
  kit.user!.user.generation = 'two';
  resolve({ round_id: destination.roundId, score: 8 });
  await flushPromises();
  expect(view.emitted('confirmed')).toBeUndefined();
  expect(view.html()).not.toContain(token);
  expect(kit.ownRating).not.toHaveBeenCalled();
});
test('finds the same canonical movie using explicit pagination only', async () => {
  kit.entries.mockResolvedValueOnce({
    items: [{ entry_id: 'wrong-entry', movie_id: 'different' }],
    next_cursor: 'next',
  });
  render();
  await click(en.rankingRatingCopy.open);
  await click('Source');
  expect(kit.rounds).not.toHaveBeenCalled();
  expect(kit.entries).toHaveBeenCalledTimes(1);
  await click(en.rankingRatingCopy.moreMovies);
  expect(kit.entries).toHaveBeenLastCalledWith('source', 'next', expect.any(AbortSignal));
  expect(kit.rounds).toHaveBeenCalledExactlyOnceWith(
    'source',
    'entry-source',
    undefined,
    expect.any(AbortSignal),
  );
});
test('uses localized copy and cannot open while another editor is active', async () => {
  render('pt-BR', true);
  expect(view.text()).toContain(pt.rankingRatingCopy.open);
  await click(pt.rankingRatingCopy.open);
  expect(kit.list).not.toHaveBeenCalled();
});
