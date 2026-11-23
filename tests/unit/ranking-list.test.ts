import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '../../i18n/locales/en/rankings.json';
import pt from '../../i18n/locales/pt-BR/rankings.json';
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  user: null as any,
  leave: null as any,
}));
vi.mock('vue-router', async (original) => ({
  ...(await original<any>()),
  onBeforeRouteLeave: (handler: any) => {
    mocks.leave = handler;
  },
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('../../src/modules/ranking/services/RankingService', async (original) => ({
  ...(await original<any>()),
  default: mocks,
}));
import Inbox from '../../src/modules/ranking/components/RankingInvitationInbox.vue';
import View from '../../src/modules/ranking/views/RankingListView.vue';
const id = '11111111-1111-4111-8111-111111111111';
const item = {
  ranking_id: id,
  name: 'Cinema',
  visibility: 'PRIVATE',
  admission: 'INVITATION',
  capabilities: ['READ'],
};
let wrapper: VueWrapper | undefined;
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function render(locale = 'en') {
  wrapper = mount(View, {
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale,
          messages: { en: { rankings: en }, 'pt-BR': { rankings: pt } },
        }),
      ],
      stubs: {
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        BaseSelect: true,
        RankingInvitationInbox: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = reactive({ user: { generation: 'a', isLoged: true } });
  mocks.list.mockResolvedValue({ items: [], next_cursor: null });
});
afterEach(() => wrapper?.unmount());
test.each(['en', 'pt-BR'])(
  'empty/create/list translated %s and user name remains verbatim',
  async (locale) => {
    const w = await render(locale);
    expect(w.text()).toContain(locale === 'en' ? en.empty : pt.empty);
    mocks.create.mockResolvedValue(item);
    await w.get('input').setValue('Cinema');
    await w.get('form').trigger('submit');
    await flushPromises();
    expect(w.get(`a[href="/rankings/${id}"]`).text()).toBe('Cinema');
    expect(w.text()).toContain(locale === 'en' ? en.created : pt.created);
  },
);
test('duplicate submits cannot create two rankings', async () => {
  const pending = deferred();
  mocks.create.mockReturnValue(pending.promise);
  const w = await render();
  await w.get('input').setValue('Cinema');
  await w.get('form').trigger('submit');
  await w.get('form').trigger('submit');
  expect(mocks.create).toHaveBeenCalledTimes(1);
  pending.resolve(item);
  await flushPromises();
});
test('stale account response cannot display another account rankings', async () => {
  const pending = deferred();
  mocks.list.mockReturnValueOnce(pending.promise);
  const w = await render();
  mocks.user.user.generation = 'b';
  await flushPromises();
  pending.resolve({ items: [item], next_cursor: null });
  await flushPromises();
  expect(w.text()).not.toContain('Cinema');
});
test('quota error preserves form and unknown result prevents blind retry', async () => {
  const w = await render();
  await w.get('input').setValue('Cinema');
  mocks.create.mockRejectedValueOnce({
    response: { status: 409, data: { data: { code: 'ranking.creation_limit_reached' } } },
  });
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(w.text()).toContain(en.errors.limitReached);
  expect((w.get('input').element as HTMLInputElement).value).toBe('Cinema');
  mocks.create.mockRejectedValueOnce(new Error('network'));
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(w.text()).toContain(en.errors.uncertain);
  await w.get('form').trigger('submit');
  expect(mocks.create).toHaveBeenCalledTimes(2);
});

test('session expiry clears rankings even when generation has not changed', async () => {
  mocks.list.mockResolvedValue({ items: [item], next_cursor: null });
  const w = await render();
  expect(w.text()).toContain('Cinema');
  mocks.user.user.isLoged = false;
  await flushPromises();
  expect(w.text()).not.toContain('Cinema');
});

test('cancelled navigation preserves draft; confirming resolves the guarded navigation', async () => {
  const w = await render();
  await w.get('input').setValue('Unsent name');
  const decision = mocks.leave();
  await flushPromises();
  w.findComponent({ name: 'BaseConfirmDialog' }).vm.$emit('cancel');
  expect(await decision).toBe(false);
  expect((w.get('input').element as HTMLInputElement).value).toBe('Unsent name');
  const next = mocks.leave();
  await flushPromises();
  w.findComponent({ name: 'BaseConfirmDialog' }).vm.$emit('ok');
  expect(await next).toBe(true);
});

test('verified inbox join resets the ranking cursor, supersedes stale pagination, and keeps draft', async () => {
  const extra = '22222222-2222-4222-8222-222222222222';
  const page = deferred();
  mocks.list.mockResolvedValueOnce({ items: [item], next_cursor: id });
  mocks.list.mockReturnValueOnce(page.promise);
  const w = await render();
  await w.get('input').setValue('Keep this draft');
  await w
    .findAll('button')
    .find((b) => b.text() === en.more)!
    .trigger('click');
  const staleSignal = mocks.list.mock.calls[1]![1] as AbortSignal;
  mocks.list.mockResolvedValueOnce({
    items: [{ ...item, ranking_id: extra, name: 'Fresh ranking' }],
    next_cursor: null,
  });
  w.getComponent(Inbox).vm.$emit('joined', { ...item, ranking_id: extra, name: 'Fresh ranking' });
  await flushPromises();
  expect(staleSignal.aborted).toBe(true);
  expect(mocks.list).toHaveBeenCalledTimes(3);
  expect(mocks.list).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
  expect(w.text()).toContain('Fresh ranking');
  expect(w.text()).not.toContain(en.more);
  expect((w.get('input').element as HTMLInputElement).value).toBe('Keep this draft');
  page.resolve({ items: [{ ...item, name: 'Stale page' }], next_cursor: id });
  await flushPromises();
  expect(w.text()).not.toContain('Stale page');
  mocks.user.user.isLoged = false;
  await flushPromises();
  expect(w.findComponent(Inbox).exists()).toBe(false);
  expect(w.text()).not.toContain('Fresh ranking');
});
