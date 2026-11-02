export type TurnstileAction = 'login' | 'signup' | 'password_recovery' | 'password_reset';
export interface TurnstileOptions {
  sitekey: string;
  action: TurnstileAction;
  theme: 'light' | 'dark';
  size: 'flexible' | 'compact';
  language: 'pt-br';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  'timeout-callback': () => void;
  'response-field': false;
}
export interface TurnstileApi {
  render: (element: HTMLElement, options: TurnstileOptions) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
let pending: Promise<TurnstileApi> | undefined;
/** Load once for concurrent forms. Failed loads may be retried without retaining callbacks. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (pending) return pending;
  pending = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    const timer = setTimeout(() => finish(false), 15000);
    function finish(ok: boolean) {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (ok && window.turnstile) resolve(window.turnstile);
      else {
        script.remove();
        pending = undefined;
        reject(new Error('Verification could not load'));
      }
    }
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    document.head.append(script);
  });
  return pending;
}
