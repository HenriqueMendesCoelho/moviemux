import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en/ranking-visibility.json';
import pt from '../../i18n/locales/pt-BR/ranking-visibility.json';

const kit = vi.hoisted(() => ({
  settings: vi.fn(),
  save: vi.fn(),
  user: null as { user: { generation: string; isLoged: boolean } } | null,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('../../src/modules/ranking/services/RankingVisibilityService', () => ({ default: kit }));
import Settings from '../../src/modules/ranking/components/RankingVisibilitySettings.vue';

const id = 'abcdefab-2222-4222-8222-222222222222';
const other = 'abcdefab-3333-4333-8333-333333333333';
let wrapper: VueWrapper | undefined;
function locale(lang: string) {
  return createI18n({
    legacy: false,
    locale: lang,
    messages: {
      en: { rankingVisibility: en, components: { cancel: 'Cancel' } },
      'pt-BR': { rankingVisibility: pt, components: { cancel: 'Cancelar' } },
    },
    missingWarn: false,
    fallbackWarn: false,
  });
}
async function show(lang = 'en') {
  wrapper = mount(Settings, { props: { rankingId: id }, global: { plugins: [locale(lang)] } });
  await flushPromises();
  return wrapper;
}
function button(text: string) {
  const b = wrapper?.findAll('button').find((item) => item.text() === text);
  if (!b) throw new Error(`Missing button ${text}`);
  return b;
}
async function click(text: string) {
  await button(text).trigger('click');
  await flushPromises();
}
function denied(status: number) {
  return { response: { status } };
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({ user: { generation: 'a', isLoged: true } });
  kit.settings.mockResolvedValue('PRIVATE');
  kit.save.mockImplementation(async (_id, value) => value);
  if (!HTMLDialogElement.prototype.showModal)
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  if (!HTMLDialogElement.prototype.close)
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

test('SSR never calls owner settings or reveals controls', async () => {
  const app = createSSRApp(Settings, { rankingId: id });
  app.use(locale('en'));
  const html = await renderToString(app);
  expect(html).not.toContain(en.makePublic);
  expect(kit.settings).not.toHaveBeenCalled();
});
test.each([401, 403, 404, 502])('no action without a successful fresh GET (%s)', async (status) => {
  kit.settings.mockRejectedValue(denied(status));
  const view = await show();
  expect(view.find('section').exists()).toBe(false);
  expect(view.emitted('scopeLost')).toBeUndefined();
  expect(kit.save).not.toHaveBeenCalled();
});
test('PUBLIC disclosure, cancel and repeated clicks require an independent save confirmation', async () => {
  const view = await show();
  expect(view.text()).toContain(en.private);
  await click(en.makePublic);
  expect(view.text()).toContain(en.publicDisclosure);
  expect(kit.save).not.toHaveBeenCalled();
  expect(view.emitted('interaction')).toEqual([['draft']]);
  await click('Cancel');
  expect(view.emitted('interaction')?.at(-1)).toEqual(['idle']);
  expect(kit.save).not.toHaveBeenCalled();

  const hold = Promise.withResolvers<'PUBLIC'>();
  kit.save.mockReturnValueOnce(hold.promise);
  await click(en.makePublic);
  await click(en.confirmSave);
  expect(view.text()).toContain(en.private);
  expect(view.emitted('interaction')?.at(-1)).toEqual(['pending']);
  expect(kit.save).toHaveBeenCalledExactlyOnceWith(id, 'PUBLIC');
  expect(button(en.makePublic).attributes('disabled')).toBeDefined();

  hold.resolve('PUBLIC');
  await flushPromises();
  expect(view.text()).toContain(en.public);
  expect(view.text()).toContain(en.saved);
  expect(view.emitted('settings')?.at(-1)).toEqual(['PUBLIC']);
  expect(view.emitted('interaction')?.at(-1)).toEqual(['idle']);
});
test('localized private disclosure explains already-seen data and unchanged admission', async () => {
  kit.settings.mockResolvedValueOnce('PUBLIC');
  const view = await show('pt-BR');
  await click(pt.makePrivate);
  expect(view.text()).toContain(pt.privateDisclosure);
  expect(view.text()).toContain('Não é possível apagar o que alguém já viu.');
  expect(kit.save).not.toHaveBeenCalled();
  await click(pt.confirmSave);
  expect(kit.save).toHaveBeenCalledExactlyOnceWith(id, 'PRIVATE');
  expect(view.text()).toContain(pt.private);
});
test.each(['PUBLIC', 'PRIVATE'] as const)(
  'unknown PUT refetches only on explicit check and requires a new confirmation (%s)',
  async (seen) => {
    kit.save.mockRejectedValueOnce(new Error('network'));
    const view = await show();
    await click(en.makePublic);
    await click(en.confirmSave);
    expect(view.text()).toContain(en.unknown);
    expect(view.emitted('settings')?.at(-1)).toEqual([null]);
    expect(view.emitted('interaction')?.at(-1)).toEqual(['uncertain']);
    expect(kit.settings).toHaveBeenCalledTimes(1);
    expect(kit.save).toHaveBeenCalledTimes(1);

    kit.settings.mockRejectedValueOnce(new Error('offline'));
    await click(en.check);
    expect(view.text()).toContain(en.unverified);
    expect(view.emitted('interaction')?.at(-1)).toEqual(['uncertain']);

    kit.settings.mockResolvedValueOnce(seen);
    await click(en.check);
    expect(view.text()).toContain(seen === 'PUBLIC' ? en.verified : en.different);
    expect(view.text()).not.toContain(en.saved);
    expect(kit.save).toHaveBeenCalledTimes(1);
    await click(seen === 'PUBLIC' ? en.makePrivate : en.makePublic);
    expect(kit.save).toHaveBeenCalledTimes(1);
  },
);
test('revoked owner is cleared without exposing fallback visibility', async () => {
  kit.save.mockRejectedValueOnce(denied(404));
  const view = await show();
  await click(en.makePublic);
  await click(en.confirmSave);
  expect(view.find('section').exists()).toBe(false);
  expect(view.emitted('settings')?.at(-1)).toEqual([null]);
  expect(view.emitted('scopeLost')).toEqual([[404]]);
});
test('late results cannot resurrect a prior collection or logout', async () => {
  const delayedRead = Promise.withResolvers<'PUBLIC'>();
  kit.settings.mockReturnValueOnce(delayedRead.promise).mockResolvedValueOnce('PRIVATE');
  const view = await show();
  const firstSignal = kit.settings.mock.calls[0]?.[1] as AbortSignal;
  await view.setProps({ rankingId: other });
  expect(firstSignal.aborted).toBe(true);
  delayedRead.resolve('PUBLIC');
  await flushPromises();
  expect(view.text()).toContain(en.private);

  const delayedWrite = Promise.withResolvers<'PUBLIC'>();
  kit.save.mockReturnValueOnce(delayedWrite.promise);
  await click(en.makePublic);
  await click(en.confirmSave);
  kit.user!.user.isLoged = false;
  delayedWrite.resolve('PUBLIC');
  await flushPromises();
  expect(view.find('section').exists()).toBe(false);
  expect(view.emitted('settings')?.at(-1)).toEqual([null]);
  expect(kit.save).toHaveBeenCalledExactlyOnceWith(other, 'PUBLIC');
});
test('a draft remains unwritten when blocked or collection changes', async () => {
  const view = await show();
  await click(en.makePublic);
  await view.setProps({ blockWrite: true });
  await click(en.confirmSave);
  expect(kit.save).not.toHaveBeenCalled();
  await view.setProps({ blockWrite: false });
  await click(en.makePublic);
  await view.setProps({ rankingId: other });
  await flushPromises();
  expect(view.emitted('interaction')?.at(-1)).toEqual(['idle']);
  expect(kit.save).not.toHaveBeenCalled();
});
