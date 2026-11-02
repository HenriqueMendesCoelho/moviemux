import { describe, expect, it } from 'vitest';
import { localDevApiProxy } from '../../config/local-dev-api';
import { resolveApiBaseURL } from '../../src/core/resolveApiBaseURL';
describe('local-only development API proxy', () => {
  it.each(['http://127.0.0.1:18081', 'http://localhost:18081/', 'https://[::1]:18081'])(
    'accepts explicit local origin %s',
    (origin) => {
      const proxy = localDevApiProxy(origin, true)!;
      expect(proxy.target).toBe(`${new URL(origin).origin}/api`);
      expect(proxy.headers.origin).toBe(new URL(origin).origin);
      expect(proxy.changeOrigin).toBe(true);
      expect(proxy.prependPath).toBe(true);
    },
  );
  it.each([
    'https://example.com',
    'http://localhost.evil.test',
    'http://127.0.0.2',
    'http://127.1',
    'http://2130706433',
    'http://user:password@localhost:18081',
    'http://localhost:18081/api',
    'http://localhost:18081/?x=1',
    'http://localhost:18081/#a',
    'file://localhost',
    'http://localhost:0',
    'http://localhost:65536',
    ' http://localhost:18081',
    'http://localhost:18081\\evil',
    'http://localhost:18081/../',
  ])('rejects non-origin or non-loopback input %s', (origin) => {
    expect(() => localDevApiProxy(origin, true)).toThrow('MOVIEMUX_DEV_API_ORIGIN');
  });
  it('does nothing without explicit opt-in or in production, even if an env value is supplied', () => {
    expect(localDevApiProxy(undefined, true)).toBeUndefined();
    expect(localDevApiProxy('', true)).toBeUndefined();
    expect(localDevApiProxy('http://127.0.0.1:18081', false)).toBeUndefined();
    expect(localDevApiProxy('https://remote.invalid', false)).toBeUndefined();
  });
});
describe('request-scoped API base URL', () => {
  it('keeps browser relative and production absolute endpoints unchanged', () => {
    expect(resolveApiBaseURL('/api')).toBe('/api');
    expect(resolveApiBaseURL('https://api.example.test/api', 'http://127.0.0.1:19000')).toBe(
      'https://api.example.test/api',
    );
    expect(resolveApiBaseURL(undefined, 'http://127.0.0.1:19000')).toBeUndefined();
  });
  it('resolves the local relative API path against the current SSR request origin', () => {
    expect(resolveApiBaseURL('/api', 'http://127.0.0.1:19000')).toBe('http://127.0.0.1:19000/api');
    expect(resolveApiBaseURL('/api', 'http://127.0.0.1:19001')).toBe('http://127.0.0.1:19001/api');
  });
});
