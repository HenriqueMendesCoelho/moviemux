import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/ranking-join.json';
import pt from '../../i18n/locales/pt-BR/ranking-join.json';
const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  summary: vi.fn(),
  access: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('~/core/http', () => ({ default: {} }));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({ default: mocks }));
vi.mock('../../src/modules/ranking/services/RankingJoinService', async (original) => ({
  ...(await original<typeof import('../../src/modules/ranking/services/RankingJoinService')>()),
  default: mocks.join,
}));
import View from '../../src/modules/ranking/views/RankingJoinView.vue';
const id = 'abcdefab-2222-4222-8222-222222222222',
  other = '33333333-3333-4333-8333-333333333333';
const summary = {
  ranking_id: id,
  name: '<b>Private ranking</b>',
  admission: 'OPEN',
  visibility: 'PRIVATE',
  capabilities: ['READ', 'RATE_OWN'],
};
let w: VueWrapper | undefined;
function locales(locale = 'en') {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      en: { rankingJoin: en, rankings: { unnamed: 'Unnamed collection' } },
      'pt-BR': { rankingJoin: pt, rankings: { unnamed: 'Coleção sem nome' } },
    },
  });
}
function view(rankingId: unknown = id, locale = 'en') {
  w = mount(View, {
    props: { rankingId },
    global: {
      plugins: [locales(locale)],
      stubs: {
        NuxtLink: {
          props: { to: String, noPrefetch: Boolean },
          template: '<a :href="to" :data-no-prefetch="noPrefetch"><slot/></a>',
        },
      },
    },
  });
  return w;
}
async function click(name: string) {
  const btn = w?.findAll('button').find((b) => b.text() === name);
  if (!btn) throw new Error(`Missing ${name}`);
  await btn.trigger('click');
  await flushPromises();
}
function pending<T>() {
  const ready = Promise.withResolvers<T>();
  return ready;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user = reactive({ user: { generation: 'a', isLoged: true } });
  mocks.join.mockResolvedValue(undefined);
  mocks.summary.mockResolvedValue(summary);
  mocks.access.mockResolvedValue({ ranking_id: id, capabilities: ['READ'] });
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('neutral authenticated view has no pre-join network, IDs/titles, or action unless explicitly clicked', async () => {
  view(id.toUpperCase());
  await flushPromises();
  expect(w!.text()).toContain(en.join);
  expect(w!.html()).not.toContain(id);
  expect(w!.html()).not.toContain(summary.name);
  expect(mocks.join).not.toHaveBeenCalled();
  expect(mocks.summary).not.toHaveBeenCalled();
  expect(mocks.access).not.toHaveBeenCalled();
  await click(en.join);
  expect(mocks.join).toHaveBeenCalledExactlyOnceWith(id);
  expect(mocks.summary).toHaveBeenCalledExactlyOnceWith(id, expect.any(AbortSignal));
  expect(w!.text()).toContain(summary.name);
  expect(w!.find('b').exists()).toBe(false);
  expect(w!.get(`a[href="/rankings/${id}"]`).attributes('data-no-prefetch')).toBe('true');
});
test('SSR and invalid UUID render safe strings without membership requests', async () => {
  const app = createSSRApp(View, { rankingId: id });
  app.use(locales());
  app.component('NuxtLink', { template: '<span><slot/></span>' });
  const html = await renderToString(app);
  expect(html).not.toContain(id);
  expect(html).toContain(en.join);
  view(['not-id'], 'pt-BR');
  expect(w!.text()).toContain(pt.unavailable);
  expect(w!.find('button').exists()).toBe(false);
  expect(mocks.join).not.toHaveBeenCalled();
  expect(mocks.summary).not.toHaveBeenCalled();
  expect(mocks.access).not.toHaveBeenCalled();
});
test('204 waits for current summary READ, a denial never offers another POST', async () => {
  const result = pending<typeof summary>();
  mocks.summary.mockReturnValueOnce(result.promise);
  view();
  await click(en.join);
  expect(w!.text()).toContain(en.working);
  expect(w!.find(`a[href="/rankings/${id}"]`).exists()).toBe(false);
  result.resolve({ ...summary, capabilities: [] });
  await flushPromises();
  expect(w!.text()).toContain(en.accessUnavailable);
  expect(w!.text()).not.toContain(summary.name);
  await click(en.check);
  expect(mocks.access).not.toHaveBeenCalled();
  expect(mocks.join).toHaveBeenCalledTimes(1);
  expect(mocks.summary).toHaveBeenCalledTimes(2);
});
test('unknown outcome requires explicit access check; verified presence only then allows summary', async () => {
  mocks.join.mockRejectedValueOnce(new Error('secret'));
  view();
  await click(en.join);
  expect(w!.text()).toContain(en.uncertain);
  expect(w!.text()).not.toContain('secret');
  expect(w!.text()).not.toContain(en.retry);
  expect(mocks.access).not.toHaveBeenCalled();
  expect(mocks.summary).not.toHaveBeenCalled();
  await click(en.check);
  expect(mocks.join).toHaveBeenCalledTimes(1);
  expect(mocks.access).toHaveBeenCalledExactlyOnceWith(id, expect.any(AbortSignal));
  expect(mocks.summary).toHaveBeenCalledTimes(1);
  expect(w!.text()).toContain(summary.name);
});
test('authorized access 404 after uncertainty is ambiguous and only user may retry', async () => {
  mocks.join.mockRejectedValueOnce(new Error('network'));
  mocks.access.mockRejectedValueOnce({
    response: { status: 404, data: { data: { code: 'ranking.not_found' } } },
  });
  view();
  await click(en.join);
  await click(en.check);
  expect(w!.text()).toContain(en.cannotConfirm);
  expect(w!.text()).toContain(en.retry);
  expect(mocks.join).toHaveBeenCalledTimes(1);
  expect(mocks.summary).not.toHaveBeenCalled();
  await click(en.retry);
  expect(mocks.join).toHaveBeenCalledTimes(2);
});
test.each([401, 403, 404])(
  'ordinary denied POST %s never queries or reveals ranking',
  async (status) => {
    mocks.join.mockRejectedValueOnce({ response: { status, data: { message: 'private title' } } });
    view();
    await click(en.join);
    expect(w!.text()).toContain(status === 401 ? en.sessionExpired : en.unavailable);
    expect(w!.text()).not.toContain('private title');
    expect(w!.find('button').exists()).toBe(false);
    expect(mocks.summary).not.toHaveBeenCalled();
    expect(mocks.access).not.toHaveBeenCalled();
  },
);
test('repeated click sends once; old session POST cannot fetch summary', async () => {
  const result = pending<void>();
  mocks.join.mockReturnValueOnce(result.promise);
  view();
  const btn = w!.get('button');
  const first = btn.trigger('click');
  await btn.trigger('click');
  await first;
  expect(mocks.join).toHaveBeenCalledTimes(1);
  mocks.user!.user.generation = 'b';
  result.resolve();
  await flushPromises();
  expect(mocks.summary).not.toHaveBeenCalled();
  expect(w!.text()).not.toContain(summary.name);
});
test('stale scope summary cannot reveal previous ranking', async () => {
  const result = pending<typeof summary>();
  mocks.summary.mockReturnValueOnce(result.promise);
  view();
  await click(en.join);
  await w!.setProps({ rankingId: other });
  result.resolve(summary);
  await flushPromises();
  expect(w!.text()).not.toContain(summary.name);
  expect(w!.find(`a[href="/rankings/${id}"]`).exists()).toBe(false);
  expect((mocks.summary.mock.calls[0]![1] as AbortSignal).aborted).toBe(true);
});
