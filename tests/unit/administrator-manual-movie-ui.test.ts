import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';

const kit = vi.hoisted(() => ({
  proof: vi.fn(),
  create: vi.fn(),
  genres: vi.fn(),
  user: null as {
    isAdmin: boolean;
    user: { id: string; generation: string; isLoged: boolean };
  } | null,
  routeLeave: undefined as (() => Promise<boolean>) | undefined,
}));
vi.mock('~/core/stores/UserStore', () => ({ useUserStore: () => kit.user }));
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  onBeforeRouteLeave: (guard: () => Promise<boolean>) => {
    kit.routeLeave = guard;
  },
}));
vi.mock('~/modules/movie/services/MovieService', () => ({
  default: { getMoviesGenres: kit.genres },
}));
vi.mock('../../src/modules/movie/services/ManualCatalogService', async (original) => ({
  ...(await original<object>()),
  default: kit,
}));
import Tab from '../../src/modules/administrator/components/AdministratorManualMovieTab.vue';
import Administration from '../../src/modules/administrator/views/AdministratorView.vue';
import { ManualCatalogError } from '../../src/modules/movie/services/ManualCatalogService';

function i18n(locale: string) {
  return createI18n({
    legacy: false,
    locale,
    messages: { en, 'pt-BR': pt },
    fallbackWarn: false,
    missingWarn: false,
  });
}
const receipt = { movie_id: '10000000-0000-4000-8000-000000000039' };
let view: VueWrapper | undefined;
function render(locale = 'en') {
  view = mount(Tab, { props: { active: true }, global: { plugins: [i18n(locale)] } });
  return view;
}
function input(selector: string) {
  return view!.get(selector);
}
async function submit() {
  await view!.get('form').trigger('submit');
  await flushPromises();
}
function labelledButton(label: string) {
  return view?.findAll('button').find((button) => button.text() === label);
}
async function click(label: string) {
  const button = labelledButton(label);
  if (!button) throw Error(`Missing button ${label}`);
  await button.trigger('click');
  await flushPromises();
}
beforeEach(() => {
  vi.resetAllMocks();
  kit.user = reactive({
    isAdmin: true,
    user: { id: 'synthetic-current-admin', generation: 'a', isLoged: true },
  });
  kit.proof.mockResolvedValue(undefined);
  kit.create.mockResolvedValue(receipt);
  kit.genres.mockResolvedValue([{ id: 4, name: 'Fixture genre' }]);
});
afterEach(() => {
  view?.unmount();
  view = undefined;
});

test('SSR and non-admin visibility do not ask for proof or expose an admin form', async () => {
  const app = createSSRApp(Tab, { active: true });
  app.use(i18n('en'));
  expect(await renderToString(app)).not.toContain(en.manualCatalog.title);
  expect(kit.proof).not.toHaveBeenCalled();
  if (kit.user) kit.user.isAdmin = false;
  const panel = render();
  await flushPromises();
  expect(panel.find('form').exists()).toBe(false);
  expect(kit.proof).not.toHaveBeenCalled();
  expect(kit.create).not.toHaveBeenCalled();
});
test('admin page exposes tab only after live server proof, hides after loss', async () => {
  const latch = Promise.withResolvers<void>();
  kit.proof.mockReturnValueOnce(latch.promise);
  view = mount(Administration, {
    global: {
      plugins: [i18n('en')],
      stubs: {
        AdministratorUserTab: true,
        AdministratorListUserTab: true,
        AdministratorInviteUserTab: true,
      },
    },
  });
  expect(labelledButton(en.manualCatalog.tab)).toBeUndefined();
  latch.resolve();
  await flushPromises();
  expect(labelledButton(en.manualCatalog.tab)).toBeDefined();
  kit.proof.mockRejectedValueOnce(new ManualCatalogError(403, 'catalog.manual_forbidden'));
  await click(en.manualCatalog.tab);
  expect(labelledButton(en.manualCatalog.tab)).toBeUndefined();
  expect(view.find('form').exists()).toBe(false);
  expect(kit.create).not.toHaveBeenCalled();
});
test.each(['en', 'pt-BR'])(
  'explicit one-title catalog creation keeps civil date/omissions, not collection commands (%s)',
  async (locale) => {
    const panel = render(locale);
    const words = (locale === 'en' ? en : pt).manualCatalog;
    await flushPromises();
    expect(panel.text()).toContain(words.title);
    await submit();
    expect(panel.text()).toContain(words.invalid);
    expect(kit.create).not.toHaveBeenCalled();
    await input('input[id$="-original_title"]').setValue('  Original <movie>  ');
    await input('input[type="date"]').setValue('2024-02-29');
    await submit();
    expect(kit.create).toHaveBeenCalledExactlyOnceWith({
      command_id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      original_title: 'Original <movie>',
      release_date: '2024-02-29',
      portuguese_title: null,
      english_title: null,
      director: null,
      description: null,
      runtime: null,
      genre_ids: [],
    });
    expect(panel.text()).toContain(words.saved);
    expect(panel.html()).not.toContain(receipt.movie_id);
    expect(panel.find('a').exists()).toBe(false);
    expect(panel.findAll('input').filter((f) => f.attributes('type') === 'url')).toHaveLength(0);
  },
);
test('double submit and unknown answer preserve exact normalized command on deliberate retry', async () => {
  const panel = render();
  await flushPromises();
  await input('input[id$="-original_title"]').setValue('One title');
  const response = Promise.withResolvers<{ movie_id: string }>();
  kit.create.mockReturnValueOnce(response.promise);
  await submit();
  await submit();
  expect(kit.create).toHaveBeenCalledTimes(1);
  expect(await kit.routeLeave!()).toBe(false);
  response.reject(new Error('no response'));
  await flushPromises();
  expect(panel.text()).toContain(en.manualCatalog.uncertain);
  expect(panel.get('fieldset').attributes('disabled')).toBeDefined();
  await input('input[id$="-original_title"]').setValue('Untrusted altered draft');
  expect(kit.create).toHaveBeenCalledTimes(1);
  await click(en.manualCatalog.retry);
  expect(kit.create).toHaveBeenCalledTimes(2);
  expect(kit.create.mock.calls[0]![0]).toBe(kit.create.mock.calls[1]![0]);
  expect(kit.create.mock.calls[1]![0].original_title).toBe('One title');
  expect(panel.text()).toContain(en.manualCatalog.saved);
});
test('a conflict cannot bypass uncertain registration with an automatic or fresh command', async () => {
  const panel = render();
  await flushPromises();
  await input('input[id$="-original_title"]').setValue('One title');
  kit.create.mockRejectedValueOnce(new Error('timeout'));
  await submit();
  kit.create.mockRejectedValueOnce(new ManualCatalogError(409, 'catalog.manual_command_conflict'));
  await click(en.manualCatalog.retry);
  expect(panel.text()).toContain(en.manualCatalog.conflict);
  expect(labelledButton(en.manualCatalog.retry)).toBeUndefined();
  await submit();
  expect(kit.create).toHaveBeenCalledTimes(2);
});
test('admin revocation and late success cannot expose stale state in a new session', async () => {
  const panel = render();
  await flushPromises();
  await input('input[id$="-original_title"]').setValue('Old session title');
  const response = Promise.withResolvers<{ movie_id: string }>();
  kit.create.mockReturnValueOnce(response.promise);
  await submit();
  if (kit.user) kit.user.user.isLoged = false;
  response.resolve(receipt);
  await flushPromises();
  expect(panel.find('form').exists()).toBe(false);
  expect(panel.text()).not.toContain(en.manualCatalog.saved);
  expect(panel.emitted('available')?.at(-1)).toEqual([false]);
});

test('current server denial on write removes the form and retry without affecting other admin tabs', async () => {
  const panel = render();
  await flushPromises();
  await input('input[id$="-original_title"]').setValue('Draft not written');
  kit.create.mockRejectedValueOnce(new ManualCatalogError(403, 'catalog.manual_forbidden'));
  await submit();
  expect(panel.find('form').exists()).toBe(false);
  expect(panel.text()).not.toContain(en.manualCatalog.saved);
  expect(labelledButton(en.manualCatalog.retry)).toBeUndefined();
  expect(panel.emitted('available')?.at(-1)).toEqual([false]);
  expect(await kit.routeLeave!()).toBe(true);
});

test('transient proof failure provides only a fresh proof retry, not a form or create action', async () => {
  kit.proof.mockRejectedValueOnce(new ManualCatalogError(503));
  view = mount(Administration, {
    global: {
      plugins: [i18n('en')],
      stubs: {
        AdministratorUserTab: true,
        AdministratorListUserTab: true,
        AdministratorInviteUserTab: true,
      },
    },
  });
  await flushPromises();
  expect(view.text()).toContain(en.manualCatalog.proofError);
  expect(labelledButton(en.manualCatalog.tab)).toBeUndefined();
  expect(view.find('form').exists()).toBe(false);
  await click(en.manualCatalog.retryProof);
  expect(kit.proof).toHaveBeenCalledTimes(2);
  expect(view.text()).not.toContain(en.manualCatalog.proofError);
  expect(labelledButton(en.manualCatalog.tab)).toBeDefined();
  expect(kit.create).not.toHaveBeenCalled();
});
