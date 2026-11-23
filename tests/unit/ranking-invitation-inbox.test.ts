import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import { reactive } from 'vue';
import enLocale from '../../i18n/locales/en';
import ptLocale from '../../i18n/locales/pt-BR';
const fixture = vi.hoisted(() => ({
  incoming: vi.fn(),
  accept: vi.fn(),
  summary: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => fixture.user }));
vi.mock('../../src/modules/ranking/services/RankingInvitationInboxService', () => ({
  default: fixture,
}));
vi.mock('../../src/modules/ranking/services/RankingCatalogService', () => ({ default: fixture }));
import Inbox from '../../src/modules/ranking/components/RankingInvitationInbox.vue';
const rank = '11111111-1111-4111-8111-111111111111',
  invite = '22222222-2222-4222-8222-222222222222';
const item = {
  invite_id: invite,
  ranking_id: rank,
  ranking_name: '<i>Authorized title</i>',
  expires_at: '2026-11-29T12:00:00Z',
};
const summary = {
  ranking_id: rank,
  name: 'Fresh title',
  visibility: 'PRIVATE',
  admission: 'INVITATION',
  capabilities: ['READ', 'RATE_OWN'],
};
const en = enLocale.rankingInvitationInbox;
let w: VueWrapper | undefined;
function render(locale = 'en') {
  w = mount(Inbox, {
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
async function click(text: string) {
  const b = w?.findAll('button').find((x) => x.text() === text);
  if (!b) throw new Error(`Missing button: ${text}`);
  await b.trigger('click');
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
  fixture.user = reactive({ user: { generation: 'a', isLoged: true } });
  fixture.incoming.mockResolvedValue({ items: [item], next_cursor: null });
  fixture.accept.mockResolvedValue(undefined);
  fixture.summary.mockResolvedValue(summary);
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});
test('shows only escaped inbox name and expiry, with no preview, ID, link or preaccept summary', async () => {
  render();
  await flushPromises();
  expect(w!.text()).toContain(item.ranking_name);
  expect(w!.find('i').exists()).toBe(false);
  expect(w!.html()).not.toContain(rank);
  expect(w!.html()).not.toContain(invite);
  expect(w!.get('time').attributes('datetime')).toBe(item.expires_at);
  expect(w!.find('a').exists()).toBe(false);
  expect(fixture.summary).not.toHaveBeenCalled();
  expect(fixture.accept).not.toHaveBeenCalled();
});
test('explicit accept clears inbox titles; no navigation until returned READ summary', async () => {
  render();
  await flushPromises();
  const command = pending<void>(),
    access = pending<typeof summary>();
  fixture.accept.mockReturnValueOnce(command.promise);
  fixture.summary.mockReturnValueOnce(access.promise);
  fixture.incoming.mockResolvedValue({ items: [], next_cursor: null });
  const button = w!.get('button');
  await button.trigger('click');
  await button.trigger('click');
  expect(fixture.accept).toHaveBeenCalledTimes(1);
  expect(fixture.summary).not.toHaveBeenCalled();
  expect(w!.text()).not.toContain(item.ranking_name);
  expect(w!.find('a').exists()).toBe(false);
  command.resolve();
  await flushPromises();
  expect(fixture.summary).toHaveBeenCalledWith(rank, expect.any(AbortSignal));
  expect(w!.find('a').exists()).toBe(false);
  access.resolve(summary);
  await flushPromises();
  expect(w!.get('a').attributes('href')).toBe('/rankings/' + rank);
  expect(w!.get('a').attributes('data-no-prefetch')).toBe('true');
  expect(w!.text()).toContain(summary.name);
  expect(w!.emitted('joined')).toEqual([[summary]]);
});
test.each(['denied', 'missing-read'])(
  '204 then %s remains without link; retry rechecks only',
  async (situation) => {
    render();
    await flushPromises();
    if (situation === 'denied')
      fixture.summary.mockRejectedValueOnce({ response: { status: 404 } });
    else fixture.summary.mockResolvedValueOnce({ ...summary, capabilities: [] });
    fixture.incoming.mockResolvedValue({ items: [], next_cursor: null });
    await click(en.accept);
    await flushPromises();
    expect(w!.text()).toContain(en.accessUnconfirmed);
    expect(w!.find('a').exists()).toBe(false);
    expect(w!.emitted('joined')).toBeUndefined();
    await click(en.checkAccess);
    await flushPromises();
    expect(fixture.accept).toHaveBeenCalledTimes(1);
    expect(fixture.summary).toHaveBeenCalledTimes(2);
    expect(w!.find('a').exists()).toBe(true);
  },
);
test('accept404 clears stale item and reloads inbox without checking private summary', async () => {
  render();
  await flushPromises();
  fixture.accept.mockRejectedValueOnce({ response: { status: 404 } });
  fixture.incoming.mockResolvedValue({ items: [], next_cursor: null });
  await click(en.accept);
  await flushPromises();
  expect(w!.text()).toContain(en.inviteUnavailable);
  expect(w!.text()).not.toContain(item.ranking_name);
  expect(fixture.incoming).toHaveBeenCalledTimes(2);
  expect(fixture.summary).not.toHaveBeenCalled();
});
test('uncertain command not retried; explicit recheck is read-only', async () => {
  render();
  await flushPromises();
  fixture.accept.mockRejectedValueOnce(new Error('network'));
  fixture.incoming.mockResolvedValue({ items: [], next_cursor: null });
  await click(en.accept);
  await flushPromises();
  expect(w!.text()).toContain(en.acceptUnconfirmed);
  expect(fixture.summary).not.toHaveBeenCalled();
  expect(w!.find('a').exists()).toBe(false);
  await click(en.checkAccess);
  await flushPromises();
  expect(fixture.accept).toHaveBeenCalledTimes(1);
  expect(fixture.summary).toHaveBeenCalledTimes(1);
});
test('account switch ignores late acceptance; logout clears private projection', async () => {
  render();
  await flushPromises();
  const result = pending<void>();
  fixture.accept.mockReturnValueOnce(result.promise);
  await click(en.accept);
  fixture.user!.user.generation = 'b';
  fixture.incoming.mockResolvedValue({ items: [], next_cursor: null });
  fixture.user!.user.generation = 'c';
  result.resolve();
  await flushPromises();
  expect(fixture.summary).not.toHaveBeenCalled();
  expect(w!.find('a').exists()).toBe(false);
  fixture.user!.user.isLoged = false;
  await flushPromises();
  expect(w!.find('section').exists()).toBe(false);
});
test('PT-BR localized legacy title, pagination remains scoped', async () => {
  fixture.incoming.mockResolvedValueOnce({
    items: [{ ...item, ranking_name: null }],
    next_cursor: invite,
  });
  fixture.incoming.mockResolvedValueOnce({
    items: [{ ...item, ranking_name: null }],
    next_cursor: invite,
  });
  const pt = ptLocale.rankingInvitationInbox;
  render('pt-BR');
  await flushPromises();
  expect(w!.text()).toContain(pt.unnamed);
  await click(pt.more);
  await flushPromises();
  expect(fixture.incoming).toHaveBeenLastCalledWith(invite, expect.any(AbortSignal));
  expect(w!.findAll('li')).toHaveLength(1);
  expect(w!.text()).not.toContain(pt.more);
});
