import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import SideBar from '../../src/core/layout/app-with-nav/SideBar.vue';
import {
  createPwaInstallController,
  type NativeInstallChoice,
  type PwaInstallController,
} from '../../src/core/pwa/InstallController';
vi.mock('../../src/core/stores/UserStore', () => ({
  useUserStore: () => ({ user: { name: 'Test' }, logout: vi.fn() }),
}));
vi.mock('../../src/core/stores/StyleStore', () => ({
  useStyleStore: () => ({ layoutSettings: { isSideBarExpanded: true }, darkThemeToggle: vi.fn() }),
}));
vi.mock('../../src/core/utils/NotificationUtils', () => ({ showError: vi.fn() }));
let host: Window;
let media: EventTarget & { matches: boolean };
let controller: PwaInstallController;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function nativeEvent(choice = pending<NativeInstallChoice>()) {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: choice.promise,
  });
  host.dispatchEvent(event);
  return { event, choice };
}
beforeEach(() => {
  media = Object.assign(new EventTarget(), { matches: false });
  storage = { getItem: vi.fn().mockReturnValue('true'), setItem: vi.fn() };
  host = Object.assign(new EventTarget(), {
    matchMedia: () => media,
    localStorage: storage,
    navigator: {},
  }) as unknown as Window;
  controller = createPwaInstallController(host);
  vi.stubGlobal('useNuxtApp', () => ({ $pwaInstall: controller }));
});
afterEach(() => {
  controller.dispose();
  vi.unstubAllGlobals();
});
test('Home has no custom invitation and module install interception stays disabled', () => {
  expect(readFileSync('src/modules/movie-home/views/MovieHomeView.vue', 'utf8')).not.toContain(
    'BasePwaInstallInvitation',
  );
  expect(existsSync('src/core/components/BasePwaInstallInvitation.vue')).toBe(false);
  expect(readFileSync('nuxt.config.ts', 'utf8')).toContain('client: { installPrompt: false }');
});
test('genuine eligibility remains uncanceled and never prompts automatically', () => {
  const { event } = nativeEvent();
  expect(event.defaultPrevented).toBe(false);
  expect(event.prompt).not.toHaveBeenCalled();
  expect(controller.state.available).toBe(true);
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
test('sidebar retains eligibility across remount and explicit repeated clicks consume once', async () => {
  const makeSidebar = () => mount(SideBar, { global: { stubs: { SidebarRouteButtons: true } } });
  let w = makeSidebar();
  expect(w.text()).not.toContain('Instalar aplicativo');
  const { event, choice } = nativeEvent();
  await flushPromises();
  expect(w.text()).toContain('Instalar aplicativo');
  w.unmount();
  w = makeSidebar();
  const button = w.findAll('button').find((b) => b.text().includes('Instalar aplicativo'))!;
  button.element.click();
  button.element.click();
  expect(event.prompt).toHaveBeenCalledTimes(1);
  choice.resolve({ outcome: 'accepted' });
  await flushPromises();
  expect(w.text()).not.toContain('Instalar aplicativo');
  expect(controller.state.installed).toBe(false);
  expect(nativeEvent().event.defaultPrevented).toBe(false);
  expect(controller.state.available).toBe(false);
  w.unmount();
});
test.each(['accepted', 'dismissed'] as const)(
  'browser-owned %s clears sidebar without an app click',
  async (outcome) => {
    const { event, choice } = nativeEvent();
    choice.resolve({ outcome });
    await flushPromises();
    expect(controller.state.available).toBe(false);
    expect(event.prompt).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    nativeEvent();
    expect(controller.state.available).toBe(outcome === 'dismissed');
  },
);
test('stale browser choices cannot clear newer eligibility', async () => {
  const old = nativeEvent();
  const fresh = nativeEvent();
  old.choice.resolve({ outcome: 'accepted' });
  await flushPromises();
  expect(controller.state.available).toBe(true);
  const result = controller.install();
  expect(fresh.event.prompt).toHaveBeenCalledOnce();
  fresh.choice.resolve({ outcome: 'dismissed' });
  await result;
});
test('browser-owned choice rejection is observed without prompting', async () => {
  const { choice } = nativeEvent();
  choice.reject(new Error('browser failure'));
  await flushPromises();
  expect(controller.state.available).toBe(false);
});
test.each(['prompt', 'choice'])('native %s rejection cannot reuse event', async (path) => {
  const { event, choice } = nativeEvent();
  if (path === 'prompt') event.prompt.mockRejectedValue(new Error('native failure'));
  const result = controller.install();
  if (path === 'choice') choice.reject(new Error('choice failure'));
  else choice.resolve({ outcome: 'dismissed' });
  await result;
  expect(controller.state.feedback).toContain('menu do navegador');
  expect(controller.state.pending).toBe(false);
  await controller.install();
  expect(event.prompt).toHaveBeenCalledOnce();
});
test('early choice rejection is handled while prompt is pending', async () => {
  const { event, choice } = nativeEvent();
  const opening = pending<void>();
  event.prompt.mockReturnValue(opening.promise);
  const result = controller.install();
  choice.reject(new Error('early failure'));
  await flushPromises();
  opening.resolve();
  await result;
  expect(controller.state.feedback).toContain('menu do navegador');
});
test('appinstalled and late choice do not revive eligibility', async () => {
  const { choice } = nativeEvent();
  const result = controller.install();
  host.dispatchEvent(new Event('appinstalled'));
  choice.resolve({ outcome: 'dismissed' });
  await result;
  expect(controller.state.installed).toBe(true);
  expect(controller.state.available).toBe(false);
  expect(nativeEvent().event.defaultPrevented).toBe(false);
});
test.each(['media', 'navigator'])('installed %s state prevents sidebar eligibility', (mode) => {
  controller.dispose();
  if (mode === 'media') media.matches = true;
  else Object.assign(host.navigator, { standalone: true });
  controller = createPwaInstallController(host);
  expect(controller.state.installed).toBe(true);
  expect(nativeEvent().event.defaultPrevented).toBe(false);
  expect(controller.state.available).toBe(false);
});
test('unsupported events and disposal do not expose an unusable action', async () => {
  host.dispatchEvent(new Event('beforeinstallprompt'));
  expect(controller.state.available).toBe(false);
  const { choice } = nativeEvent();
  controller.dispose();
  choice.resolve({ outcome: 'accepted' });
  await flushPromises();
  expect(nativeEvent().event.defaultPrevented).toBe(false);
  expect(controller.state.available).toBe(false);
});

test('events during an active prompt stay uncanceled and do not replace its action', async () => {
  const first = nativeEvent();
  const result = controller.install();
  const next = nativeEvent();
  expect(next.event.defaultPrevented).toBe(false);
  expect(next.event.prompt).not.toHaveBeenCalled();
  expect(controller.state.available).toBe(false);
  first.choice.resolve({ outcome: 'dismissed' });
  await result;
  expect(controller.state.available).toBe(false);
});
test('a standalone display change clears previously eligible sidebar state', () => {
  nativeEvent();
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  expect(controller.state.installed).toBe(true);
  expect(controller.state.available).toBe(false);
});
