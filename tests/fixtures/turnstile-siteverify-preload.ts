/** Disposable smoke-test process only. Never imported by application source. */
const originalFetch = globalThis.fetch;
const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
globalThis.fetch = async (
  input: string | URL | Request,
  options?: RequestInit,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : String(input);
  if (url === verifyUrl) {
    if (options?.method !== 'POST' || options.redirect !== 'error' || !options.signal)
      throw new Error('Siteverify transport contract changed');
    const proof = new URLSearchParams(String(options.body)).get('response');
    if (proof === 'network-error')
      throw new Error('Synthetic verifier failure; never reflect proof or secret');
    if (proof === 'timeout') {
      const signal = options.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    }
    return originalFetch('http://127.0.0.1:3231/siteverify', options);
  }
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1')
    throw new Error('External network forbidden in security smoke');
  return originalFetch(input, options);
};
