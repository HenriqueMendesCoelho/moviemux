import { reactive } from 'vue';

export interface NativeInstallChoice {
  outcome: 'accepted' | 'dismissed';
  platform?: string;
}
export interface NativeInstallEvent extends Event {
  prompt: () => Promise<unknown>;
  userChoice: Promise<NativeInstallChoice>;
}

/** Observe browser promotion without canceling it. One controller per client app. */
export function createPwaInstallController(host: Window) {
  const state = reactive({ available: false, installed: false, pending: false, feedback: '' });
  const media = host.matchMedia('(display-mode: standalone)');
  let event: NativeInstallEvent | undefined;
  let active: NativeInstallEvent | undefined;
  let accepted = false;
  let disposed = false;
  function clear() {
    event = undefined;
    state.available = false;
  }
  function markInstalled() {
    state.installed = true;
    state.feedback = '';
    clear();
  }
  function displayChanged() {
    if (media.matches || (host.navigator as Navigator & { standalone?: boolean }).standalone)
      markInstalled();
  }
  function capture(raw: Event) {
    if (disposed || accepted || state.installed || state.pending) return;
    const candidate = raw as Partial<NativeInstallEvent>;
    if (typeof candidate.prompt !== 'function' || typeof candidate.userChoice?.then !== 'function')
      return;
    const current = candidate as NativeInstallEvent;
    event = current;
    state.feedback = '';
    state.available = true;
    // Do not preventDefault: Chromium owns its promotion and may settle this
    // choice without a sidebar click. Observe rejection immediately as well.
    void current.userChoice.then(
      (choice) => {
        if (disposed || state.installed || (event !== current && active !== current)) return;
        clear();
        if (choice.outcome === 'accepted') accepted = true;
      },
      () => {
        if (!disposed && event === current) clear();
      },
    );
  }
  async function install() {
    if (disposed || !state.available || state.installed || state.pending || !event) return;
    const current = event;
    active = current;
    clear();
    state.pending = true;
    try {
      // Consume before awaiting. prompt() stays in the user's click stack.
      const choiceResult = current.userChoice.then(
        (choice) => ({ choice }),
        (error: unknown) => ({ error }),
      );
      await current.prompt();
      const result = await choiceResult;
      if ('error' in result) throw result.error;
    } catch {
      if (!disposed && !state.installed)
        state.feedback = 'shell.installFailed';
    } finally {
      active = undefined;
      if (!disposed) state.pending = false;
    }
  }
  displayChanged();
  host.addEventListener('beforeinstallprompt', capture);
  host.addEventListener('appinstalled', markInstalled);
  media.addEventListener('change', displayChanged);
  function dispose() {
    disposed = true;
    clear();
    host.removeEventListener('beforeinstallprompt', capture);
    host.removeEventListener('appinstalled', markInstalled);
    media.removeEventListener('change', displayChanged);
  }
  return { state, install, dispose };
}
export type PwaInstallController = ReturnType<typeof createPwaInstallController>;
