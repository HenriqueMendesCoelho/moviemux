import { reactive } from 'vue';

export interface NativeInstallChoice {
  outcome: 'accepted' | 'dismissed';
  platform?: string;
}
export interface NativeInstallEvent extends Event {
  prompt: () => Promise<unknown>;
  userChoice: Promise<NativeInstallChoice>;
}
const DISMISSED_KEY = 'moviemux:pwa-install-dismissed';

/** One browser-owned event controller per client app. Never instantiate during SSR. */
export function createPwaInstallController(host: Window) {
  const state = reactive({ available: false, installed: false, pending: false, feedback: '' });
  const media = host.matchMedia('(display-mode: standalone)');
  let event: NativeInstallEvent | undefined;
  let dismissed = false;
  let accepted = false;
  let disposed = false;
  try {
    dismissed = host.localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    /* memory only */
  }
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
    if (disposed || dismissed || accepted || state.installed || state.pending) return;
    const candidate = raw as Partial<NativeInstallEvent>;
    if (typeof candidate.prompt !== 'function' || !candidate.userChoice) return;
    raw.preventDefault();
    event = candidate as NativeInstallEvent;
    state.feedback = '';
    state.available = true;
  }
  function dismiss() {
    dismissed = true;
    state.feedback = '';
    clear();
    try {
      host.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      /* retain app-lifetime opt-out */
    }
  }
  async function install() {
    if (disposed || !state.available || state.installed || state.pending || !event) return;
    const current = event;
    clear();
    state.pending = true;
    try {
      // Called synchronously in the user's click stack. Consume before awaiting.
      const choiceResult = current.userChoice.then(
        (choice) => ({ choice }),
        (error: unknown) => ({ error }),
      );
      await current.prompt();
      const result = await choiceResult;
      if ('error' in result) throw result.error;
      const choice = result.choice;
      if (disposed || state.installed) return;
      if (choice.outcome === 'dismissed') dismiss();
      else accepted = true; // A choice is not proof of completed installation.
    } catch {
      if (!disposed && !state.installed)
        state.feedback = 'Não foi possível abrir a instalação. Consulte o menu do navegador.';
    } finally {
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
  return { state, install, dismiss, dispose };
}
export type PwaInstallController = ReturnType<typeof createPwaInstallController>;
