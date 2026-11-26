import { beforeEach, expect, it, vi } from 'vitest';
import registration from '../../src/modules/login/services/RegistrationService';
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('~/core/http', () => ({ default: mock }));
beforeEach(() => vi.resetAllMocks());
it.each(['INVITE_ONLY', 'WAITLIST', 'OPEN'])('accepts only current known mode %s', async (mode) => {
  mock.get.mockResolvedValue({ status: 200, data: { mode } });
  const abort = new AbortController();
  expect(await registration.mode(abort.signal)).toBe(mode);
  expect(mock.get).toHaveBeenCalledExactlyOnceWith('/public/registration-mode', {
    signal: abort.signal,
  });
});
it.each([
  { mode: 'open' },
  { mode: 'OPEN', private_data: 'must not be used' },
  {},
  null,
  { mode: 'UNKNOWN' },
])('rejects non-exact mode receipt %s', async (data) => {
  mock.get.mockResolvedValue({ status: 200, data });
  await expect(registration.mode()).rejects.toThrow();
});
it('sends only email and action challenge and requires uniform empty 202 receipt', async () => {
  mock.post.mockResolvedValueOnce({ status: 202, data: '' });
  await registration.waitlist('fixture@example.invalid', 'synthetic-action-token');
  expect(mock.post).toHaveBeenCalledExactlyOnceWith('/public/registration-waitlist', {
    email: 'fixture@example.invalid',
    'cf-turnstile-response': 'synthetic-action-token',
  });
  mock.post.mockResolvedValueOnce({ status: 202, data: { private_status: 'duplicate' } });
  await expect(
    registration.waitlist('fixture@example.invalid', 'synthetic-action-token'),
  ).rejects.toThrow();
});
