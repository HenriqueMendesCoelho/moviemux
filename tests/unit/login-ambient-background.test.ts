import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { parse, compileStyle } from 'vue/compiler-sfc';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import LoginAmbientBackground from 'src/modules/login/components/LoginAmbientBackground.vue';
let matches = true;
let mediaChanged: (() => void) | undefined;
const removeMedia = vi.fn();
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
const wrappers: VueWrapper[] = [];
function create() {
  const wrapper = mount(
    {
      components: { LoginAmbientBackground },
      template: `<main @pointermove="$refs.background.onPointerMove($event)" @pointerleave="$refs.background.onPointerLeave()" @focusin="$refs.background.onFocusIn($event)" @focusout="$refs.background.onFocusOut($event)">
      <LoginAmbientBackground ref="background" /><input aria-label="Email" /><button>Entrar</button><a href="#credits">Créditos</a>
    </main>`,
    },
    { attachTo: document.body },
  );
  vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 1000,
    height: 800,
  } as DOMRect);
  wrappers.push(wrapper);
  return wrapper;
}
function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}
beforeEach(() => {
  matches = true;
  mediaChanged = undefined;
  frames = new Map();
  nextFrame = 1;
  removeMedia.mockClear();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        get matches() {
          return matches;
        },
        addEventListener: (_event: string, handler: () => void) => {
          mediaChanged = handler;
        },
        removeEventListener: removeMedia,
      }) as unknown as MediaQueryList,
  );
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

test('server renders static decoration without invoking browser APIs or changing content', async () => {
  const html = await renderToString(
    createSSRApp({ render: () => h('main', [h(LoginAmbientBackground), h('button', 'Entrar')]) }),
  );
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('<button>Entrar</button>');
  expect(html).not.toContain('mm-login-ambient-active');
  expect(window.matchMedia).not.toHaveBeenCalled();
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
});

test('coalesces pointer events and layout reads into one bounded update without an ongoing loop', async () => {
  const wrapper = create();
  for (let index = 0; index < 10; index++)
    await wrapper.trigger('pointermove', {
      pointerType: 'mouse',
      clientX: 500 + index * 100,
      clientY: 1000,
    });
  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  expect(wrapper.element.getBoundingClientRect).not.toHaveBeenCalled();
  flushFrame();
  expect(wrapper.element.getBoundingClientRect).toHaveBeenCalledTimes(1);
  expect(wrapper.get('.mm-login-ambient').attributes('style')).toContain('--ambient-x: 18px');
  expect(wrapper.get('.mm-login-ambient').attributes('style')).toContain('--ambient-y: 18px');
  expect(frames.size).toBe(0);
  expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  await wrapper.trigger('pointerleave');
  expect(wrapper.get('.mm-login-ambient').attributes('style')).toContain('--ambient-x: 0px');
});

test('stays static for reduced-motion/coarse/no-hover preferences and responds to preference changes', async () => {
  matches = false;
  const wrapper = create();
  expect(window.matchMedia).toHaveBeenCalledWith(
    '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
  );
  await wrapper.trigger('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 200 });
  expect(wrapper.get('.mm-login-ambient').classes()).not.toContain('mm-login-ambient-active');
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  matches = true;
  mediaChanged?.();
  await wrapper.vm.$nextTick();
  expect(wrapper.get('.mm-login-ambient').classes()).toContain('mm-login-ambient-active');
  await wrapper.trigger('pointermove', { pointerType: 'touch', clientX: 100, clientY: 200 });
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
});

test('pauses while form controls are focused, including transitions between fields', async () => {
  const wrapper = create();
  await wrapper.get('input').trigger('focusin');
  expect(wrapper.get('.mm-login-ambient').classes()).not.toContain('mm-login-ambient-active');
  await wrapper.trigger('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 200 });
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  await wrapper.get('input').trigger('focusout', { relatedTarget: wrapper.get('button').element });
  expect(wrapper.get('.mm-login-ambient').classes()).not.toContain('mm-login-ambient-active');
  await wrapper.get('button').trigger('focusout', { relatedTarget: wrapper.get('a').element });
  expect(wrapper.get('.mm-login-ambient').classes()).toContain('mm-login-ambient-active');
});

test('pauses hidden windows and iframe focus, cancels pending work, then cleans up listeners', async () => {
  const documentRemove = vi.spyOn(document, 'removeEventListener');
  const windowRemove = vi.spyOn(window, 'removeEventListener');
  const wrapper = create();
  await wrapper.trigger('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 200 });
  expect(frames.size).toBe(1);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  await wrapper.vm.$nextTick();
  expect(frames.size).toBe(0);
  expect(wrapper.get('.mm-login-ambient').classes()).not.toContain('mm-login-ambient-active');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('blur'));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('.mm-login-ambient').classes()).not.toContain('mm-login-ambient-active');
  window.dispatchEvent(new Event('focus'));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('.mm-login-ambient').classes()).toContain('mm-login-ambient-active');
  await wrapper.trigger('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 200 });
  wrapper.unmount();
  expect(frames.size).toBe(0);
  expect(removeMedia).toHaveBeenCalledWith('change', expect.any(Function));
  expect(documentRemove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  expect(windowRemove).toHaveBeenCalledWith('blur', expect.any(Function));
  expect(windowRemove).toHaveBeenCalledWith('focus', expect.any(Function));
});

test('keeps all effects decorative, behind content, constrained and statically accessible', () => {
  const ambient = parse(
    readFileSync(resolve('src/modules/login/components/LoginAmbientBackground.vue'), 'utf8'),
  ).descriptor;
  const css = ambient.styles[0]!.content;
  expect(css).toContain('pointer-events: none');
  expect(css).toContain('animation-play-state: paused');
  expect(css).toContain('overflow: hidden');
  expect(css).toContain('28s');
  expect(css).toMatch(
    /@media \(hover: none\), \(pointer: coarse\), \(prefers-reduced-motion: reduce\)/,
  );
  expect(css).not.toMatch(/filter:|will-change:|position: fixed/);
  expect(compileStyle({ source: css, id: 'login-ambient', scoped: true }).errors).toEqual([]);
  const login = parse(
    readFileSync(resolve('src/modules/login/views/LoginView.vue'), 'utf8'),
  ).descriptor;
  expect(login.template?.content).toContain(
    '<SpotlightCard class="mm-login-spotlight"><LoginForm v-model="tab" /></SpotlightCard>',
  );
  expect(login.styles[0]!.content).toContain('isolation: isolate');
  expect(login.styles[0]!.content).toContain(
    'grid-template-columns: minmax(0, 1fr) minmax(340px, 440px)',
  );
});
