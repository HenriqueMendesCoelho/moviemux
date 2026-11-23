import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '../../i18n/locales/en/ranking-detail.json';
import pt from '../../i18n/locales/pt-BR/ranking-detail.json';
import ownEn from '../../i18n/locales/en/ranking-own-rating.json';
import ownPt from '../../i18n/locales/pt-BR/ranking-own-rating.json';
const messages = { en: ownEn, 'pt-BR': ownPt };
const mock = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({
  default: { ownRating: mock.read },
}));
vi.mock('../../src/modules/ranking/services/RankingOwnRatingService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../src/modules/ranking/services/RankingOwnRatingService')
  >()),
  default: mock.write,
}));
import Editor from '../../src/modules/ranking/components/RankingOwnRating.vue';
const rank = '11111111-1111-4111-8111-111111111111',
  round = '22222222-2222-4222-8222-222222222222';
let w: VueWrapper | undefined;
function render(canRate = true, locale = 'en') {
  w = mount(Editor, {
    props: {
      rankingId: rank,
      roundId: round,
      canRate,
      reconcile: false,
      targetLabel: 'Cinema · Round 3',
      onReconciliation: (value: boolean) => {
        void w?.setProps({ reconcile: value });
      },
    },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          messages: {
            en: { rankingDetail: en, rankingOwnRating: messages.en },
            'pt-BR': { rankingDetail: pt, rankingOwnRating: messages['pt-BR'] },
          },
        }),
      ],
    },
  });
  return w;
}
function button(text: string) {
  const match = w?.findAll('button').find((b) => b.text() === text);
  if (!match) throw new Error(`Missing button: ${text}`);
  return match;
}
async function fill(value: string) {
  await w!.get('input').setValue(value);
  await w!.get('form').trigger('submit');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  mock.read.mockResolvedValue({ round_id: round, score: 0 });
  mock.write.mockImplementation(async (_rank, _round, _intent, score) => ({
    round_id: _round,
    score,
  }));
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('create zero explicitly and edit existing to ten explicitly, including on a concealed round', async () => {
  render();
  await button(messages.en.add).trigger('click');
  expect(w!.text()).toContain('Cinema · Round 3');
  await fill('0');
  expect(mock.write).toHaveBeenCalledWith(rank, round, 'create', 0);
  expect(w!.text()).toContain('My rating: 0');
  await button(messages.en.edit).trigger('click');
  await fill('10');
  expect(mock.write).toHaveBeenLastCalledWith(rank, round, 'edit', 10);
  expect(w!.emitted('confirmed')).toHaveLength(2);
});
test.each([null, 14, -3])(
  'historical score %s kept until explicit edit; never coerced into the editor',
  async (score) => {
    mock.read.mockResolvedValueOnce({ round_id: round, score });
    render();
    await button(en.own).trigger('click');
    await flushPromises();
    expect(w!.text()).toContain(score === null ? en.noNumericScore : String(score));
    await button(messages.en.edit).trigger('click');
    expect((w!.get('input').element as HTMLInputElement).value).toBe('');
    expect(mock.write).not.toHaveBeenCalled();
    await button(messages.en.cancel).trigger('click');
    expect(w!.find('form').exists()).toBe(false);
    expect(w!.text()).toContain(score === null ? en.noNumericScore : String(score));
  },
);
test('read-only member can read own hidden score but cannot write; PT-BR editor validates and cancels', async () => {
  render(false, 'pt-BR');
  await button(pt.own).trigger('click');
  await flushPromises();
  expect(w!.text()).toContain('Minha nota: 0');
  expect(w!.text()).not.toContain(messages['pt-BR'].edit);
  await w!.setProps({ canRate: true });
  await button(messages['pt-BR'].edit).trigger('click');
  for (const invalid of ['', '-1', '11', '1.0', '5e0']) {
    await fill(invalid);
    expect(w!.text()).toContain(messages['pt-BR'].invalid);
  }
  expect(mock.write).not.toHaveBeenCalled();
  await w!.get('input').trigger('keydown', { key: 'Escape' });
  expect(w!.find('form').exists()).toBe(false);
});
test.each([
  [409, 'ranking.rating_exists', 'duplicate'],
  [500, 'ranking.operation_failed', 'uncertain'],
])(
  'conflict / uncertain %s reconciles via GET only, then new explicit edit',
  async (status, code, key) => {
    mock.write.mockRejectedValueOnce({ response: { status, data: { data: { code } } } });
    render();
    await button(messages.en.add).trigger('click');
    await fill('5');
    expect(w!.text()).toContain(messages.en[key as 'duplicate' | 'uncertain']);
    expect(w!.find('form').exists()).toBe(false);
    expect(mock.read).not.toHaveBeenCalled();
    await button(messages.en.check).trigger('click');
    await flushPromises();
    expect(mock.write).toHaveBeenCalledTimes(1);
    await button(messages.en.edit).trigger('click');
    await fill('6');
    expect(mock.write).toHaveBeenLastCalledWith(rank, round, 'edit', 6);
  },
);
test('archived conflict preserves own projection and disables writes', async () => {
  mock.write.mockRejectedValueOnce({
    response: { status: 409, data: { data: { code: 'ranking.archived_read_only' } } },
  });
  render();
  await button(en.own).trigger('click');
  await flushPromises();
  await button(messages.en.edit).trigger('click');
  await fill('5');
  expect(w!.text()).toContain('My rating: 0');
  expect(w!.text()).toContain(messages.en.archived);
  expect(w!.text()).not.toContain(messages.en.edit);
});
test('generic 404 is scope ambiguity, never inferred missing / POST fallback', async () => {
  mock.write.mockRejectedValueOnce({
    response: { status: 404, data: { data: { code: 'ranking.not_found' } } },
  });
  render();
  await button(en.own).trigger('click');
  await flushPromises();
  await button(messages.en.edit).trigger('click');
  await fill('3');
  expect(w!.emitted('scopeLost')).toEqual([[404]]);
  expect(mock.write).toHaveBeenCalledTimes(1);
  expect(mock.write).toHaveBeenCalledWith(rank, round, 'edit', 3);
});
test('duplicate submits and late write racing a new round cannot affect that round', async () => {
  let resolve!: (v: unknown) => void;
  mock.write.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render();
  await button(messages.en.add).trigger('click');
  await fill('5');
  await w!.get('form').trigger('submit');
  expect(mock.write).toHaveBeenCalledTimes(1);
  await w!.setProps({ roundId: '33333333-3333-4333-8333-333333333333', reconcile: false });
  resolve({ round_id: round, score: 5 });
  await flushPromises();
  expect(w!.emitted('confirmed')).toBeUndefined();
  expect(w!.text()).not.toContain('My rating: 5');
});
