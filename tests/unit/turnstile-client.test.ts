import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useStyleStore } from 'src/core/stores/StyleStore';
import type { TurnstileOptions, TurnstileApi } from 'src/core/turnstile/client';
const config = vi.hoisted(() => ({
  public: { turnstileEnabled: true, turnstileSiteKey: 'public-test' },
}));
vi.mock('#imports', () => ({ useRuntimeConfig: () => config }));
import Challenge from 'src/core/components/TurnstileChallenge.vue';
import { loadTurnstile } from 'src/core/turnstile/client';
describe('Turnstile client lifecycle', () => {
  let api: TurnstileApi;
  let options: TurnstileOptions[];
  beforeEach(() => {
    setActivePinia(createPinia());
    options = [];
    config.public.turnstileEnabled = true;
    api = {
      render: vi.fn((_el, opts) => {
        options.push(opts);
        return String(options.length);
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    };
    window.turnstile = api;
  });
  afterEach(() => {
    delete window.turnstile;
    document.head.querySelectorAll('script').forEach((s) => s.remove());
  });
  it('uses distinct widget IDs and never a hidden native response field', async () => {
    const a = mount(Challenge, { props: { action: 'login' } }),
      b = mount(Challenge, { props: { action: 'signup' } });
    await flushPromises();
    expect(options.map((o) => o.action)).toEqual(['login', 'signup']);
    expect(options[0]?.['response-field']).toBe(false);
    options[0]?.callback('token-a');
    options[1]?.callback('token-b');
    expect(a.emitted('update:modelValue')?.at(-1)).toEqual(['token-a']);
    a.vm.reset();
    expect(api.reset).toHaveBeenCalledWith('1');
    options[0]?.callback('consumed-late');
    expect(a.emitted('update:modelValue')?.at(-1)).not.toEqual(['consumed-late']);
    await flushPromises();
    expect(b.emitted('update:modelValue')?.at(-1)).toEqual(['token-b']);
    a.unmount();
    b.unmount();
    expect(api.remove).toHaveBeenCalledWith('1');
    expect(api.remove).toHaveBeenCalledWith('2');
  });
  it('clears on expiry/error, exposes retry and ignores callbacks after disposal', async () => {
    const w = mount(Challenge, { props: { action: 'password_recovery' } });
    await flushPromises();
    options[0]?.callback('token');
    options[0]?.['expired-callback']();
    await flushPromises();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(w.text()).toContain('expirou');
    await w.get('button').trigger('click');
    await flushPromises();
    options[0]?.callback('stale');
    expect(w.emitted('update:modelValue')?.at(-1)).not.toEqual(['stale']);
    options[1]?.['error-callback']();
    await flushPromises();
    expect(w.text()).toContain('Confira sua conexão');
    w.unmount();
    options[1]?.callback('late');
    expect(w.emitted('update:modelValue')?.at(-1)).not.toEqual(['late']);
  });
  it('re-renders on theme change and invalidates the old challenge', async () => {
    const w = mount(Challenge, { props: { action: 'password_reset' } });
    await flushPromises();
    expect(options[0]?.theme).toBe('dark');
    useStyleStore().layoutSettings.darkMode = false;
    await flushPromises();
    expect(api.remove).toHaveBeenCalledWith('1');
    expect(options[1]?.theme).toBe('light');
    w.unmount();
  });
  it('does not load a widget when explicitly disabled by server configuration', async () => {
    config.public.turnstileEnabled = false;
    const w = mount(Challenge, { props: { action: 'login' } });
    await flushPromises();
    expect(api.render).not.toHaveBeenCalled();
    expect(w.find('.mm-verification').exists()).toBe(false);
    w.unmount();
  });
  it('shares concurrent script loading and allows retry after a failed load', async () => {
    delete window.turnstile;
    const scripts: HTMLScriptElement[] = [];
    vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
      scripts.push(nodes[0] as HTMLScriptElement);
    });
    const first = loadTurnstile();
    const second = loadTurnstile();
    expect(first).toBe(second);
    const script = scripts[0]!;
    expect(script.src).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    );
    script.dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow('Verification could not load');
    const retry = loadTurnstile();
    expect(retry).not.toBe(first);
    window.turnstile = api;
    scripts[1]!.dispatchEvent(new Event('load'));
    expect(await retry).toBe(api);
  });
});
