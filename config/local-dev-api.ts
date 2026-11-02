/** Opt-in development-only proxy. Never accept a remote origin or arbitrary URL path. */
export function localDevApiProxy(value: string | undefined, development: boolean) {
  if (!development || !value) return undefined;
  const match = /^(https?):\/\/(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?\/?$/i.exec(value);
  if (!match || (match[3] && (Number(match[3]) < 1 || Number(match[3]) > 65535))) {
    throw new Error(
      'MOVIEMUX_DEV_API_ORIGIN must be an http(s) localhost, 127.0.0.1 or [::1] origin, without credentials, path, query or fragment.',
    );
  }
  const origin = new URL(value).origin;
  return {
    target: `${origin}/api`,
    changeOrigin: true,
    prependPath: true,
    // Spring sees this as same-origin; changeOrigin alone only rewrites Host.
    headers: { origin },
    ws: false,
  };
}
