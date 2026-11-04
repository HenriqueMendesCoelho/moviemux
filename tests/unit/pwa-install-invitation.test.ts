import { flushPromises, mount } from '@vue/test-utils';
import { renderToString } from 'vue/server-renderer';
import { createSSRApp } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import BasePwaInstallInvitation from '../../src/core/components/BasePwaInstallInvitation.vue';
import {
  createPwaInstallController,
  type NativeInstallChoice,
  type PwaInstallController,
} from '../../src/core/pwa/InstallController';
const injected = vi.hoisted(() => ({ controller: undefined as PwaInstallController | undefined }));
vi.mock('#imports', () => ({ useNuxtApp: () => ({ $pwaInstall: injected.controller }) }));
let host: Window;
let media: EventTarget & { matches: boolean };
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
const wrappers: VueWrapper[] = [];
const controllers: PwaInstallController[] = [];
function makeController() {
  const c = createPwaInstallController(host);
  controllers.push(c);
  return c;
}
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function nativeEvent(
  choice: Promise<NativeInstallChoice> = Promise.resolve({ outcome: 'accepted' }),
) {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: choice,
  });
  host.dispatchEvent(event);
  return event;
}
function create() {
  const w = mount(BasePwaInstallInvitation);
  wrappers.push(w);
  return w;
}
beforeEach(() => {
  media = Object.assign(new EventTarget(), { matches: false });
  storage = { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() };
  host = Object.assign(new EventTarget(), {
    matchMedia: () => media,
    localStorage: storage,
    navigator: {},
  }) as unknown as Window;
  injected.controller = makeController();
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  controllers.splice(0).forEach((c) => c.dispose());
});
test('SSR is empty even when client controller has an eligible event', async () => {
  nativeEvent();
  expect(await renderToString(createSSRApp(BasePwaInstallInvitation))).not.toContain(
    'Instalar app',
  );
});
test('missing controller/event never produces a fake invitation', async () => {
  const w = create();
  await flushPromises();
  expect(w.find('aside').exists()).toBe(false);
  injected.controller = undefined;
  const absent = create();
  await flushPromises();
  expect(absent.find('aside').exists()).toBe(false);
});
test('eligible action is not automatic and installed event hides it', async () => {
  const w = create();
  const event = nativeEvent();
  await flushPromises();
  expect(w.get('aside').attributes('aria-label')).toBe('Instalar MovieMux');
  expect(event.defaultPrevented).toBe(true);
  expect(event.prompt).not.toHaveBeenCalled();
  host.dispatchEvent(new Event('appinstalled'));
  await flushPromises();
  expect(w.find('aside').exists()).toBe(false);
});
test('explicit repeated clicks consume one event synchronously and await native choice', async () => {
  const choice = pending<NativeInstallChoice>();
  const event = nativeEvent(choice.promise);
  const w = create();
  await flushPromises();
  const button = w.get('button');
  button.element.click();
  button.element.click();
  expect(event.prompt).toHaveBeenCalledTimes(1);
  const replaced = nativeEvent();
  expect(replaced.defaultPrevented).toBe(false);
  choice.resolve({ outcome: 'accepted' });
  await flushPromises();
  expect(w.find('aside').exists()).toBe(false);
  nativeEvent();
  expect(injected.controller!.state.available).toBe(false);
  expect(injected.controller!.state.installed).toBe(false);
});
test('dismissal survives Home remount and guarded persistent storage failures', async () => {
  storage.setItem.mockImplementation(() => {
    throw new Error('blocked');
  });
  nativeEvent();
  const w = create();
  await flushPromises();
  await w.findAll('button')[1]!.trigger('click');
  expect(storage.setItem).toHaveBeenCalledOnce();
  w.unmount();
  nativeEvent();
  const remount = create();
  await flushPromises();
  expect(remount.find('aside').exists()).toBe(false);
});
test('persisted dismissal suppresses future capture and blocked reads remain safe', () => {
  injected.controller!.dispose();
  storage.getItem.mockReturnValue('true');
  const dismissed = makeController();
  nativeEvent();
  expect(dismissed.state.available).toBe(false);
  dismissed.dispose();
  storage.getItem.mockImplementation(() => {
    throw new Error('blocked');
  });
  const safe = makeController();
  nativeEvent();
  expect(safe.state.available).toBe(true);
});
test('native dismissed choice opts out persistently', async () => {
  const event = nativeEvent(Promise.resolve({ outcome: 'dismissed' }));
  await injected.controller!.install();
  expect(event.prompt).toHaveBeenCalledOnce();
  expect(storage.setItem).toHaveBeenCalledWith('moviemux:pwa-install-dismissed', 'true');
  nativeEvent();
  expect(injected.controller!.state.available).toBe(false);
});
test.each(['prompt', 'choice'])(
  'actual native %s rejection is caught, no reused-event loop',
  async (path) => {
    const choice = pending<NativeInstallChoice>();
    const event = nativeEvent(choice.promise);
    if (path === 'prompt') event.prompt.mockRejectedValue(new Error('native denied'));
    const result = injected.controller!.install();
    if (path === 'choice') {
      await Promise.resolve();
      choice.reject(new Error('native choice failed'));
    } else choice.resolve({ outcome: 'dismissed' });
    await result;
    expect(injected.controller!.state.feedback).toContain('menu do navegador');
    expect(injected.controller!.state.pending).toBe(false);
    await injected.controller!.install();
    expect(event.prompt).toHaveBeenCalledOnce();
  },
);
test('installed display mode and standalone suppress capture', () => {
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  const event = nativeEvent();
  expect(event.defaultPrevented).toBe(false);
  expect(injected.controller!.state.installed).toBe(true);
});
test('late choice cannot undo installed state or revive invitation after disposal', async () => {
  const choice = pending<NativeInstallChoice>();
  nativeEvent(choice.promise);
  const c = injected.controller!;
  const result = c.install();
  host.dispatchEvent(new Event('appinstalled'));
  choice.resolve({ outcome: 'dismissed' });
  await result;
  expect(c.state.installed).toBe(true);
  expect(storage.setItem).not.toHaveBeenCalled();
  c.dispose();
  nativeEvent();
  expect(c.state.available).toBe(false);
});
test('invalid events are ignored and disposal removes all capture listeners', () => {
  host.dispatchEvent(new Event('beforeinstallprompt'));
  expect(injected.controller!.state.available).toBe(false);
  injected.controller!.dispose();
  const event = nativeEvent();
  expect(event.defaultPrevented).toBe(false);
  expect(injected.controller!.state.available).toBe(false);
});

test('early userChoice rejection is observed while native prompt promise is still pending', async () => {
  const choice = pending<NativeInstallChoice>();
  const opening = pending<void>();
  const event = nativeEvent(choice.promise);
  event.prompt.mockReturnValue(opening.promise);
  const result = injected.controller!.install();
  choice.reject(new Error('choice cancelled early'));
  await flushPromises();
  opening.resolve();
  await result;
  expect(injected.controller!.state.feedback).toContain('menu do navegador');
  expect(injected.controller!.state.pending).toBe(false);
});
