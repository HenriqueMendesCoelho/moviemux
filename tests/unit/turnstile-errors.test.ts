import { describe, expect, it } from 'vitest';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
describe('safe account verification errors', () => {
  it.each([503, 403])('classifies %s without exposing response content', (status) => {
    const message = verificationFailureMessage({
      isAxiosError: true,
      response: { status, data: { message: 'private upstream secret' } },
    });
    expect(message).toBeTruthy();
    expect(message).not.toContain('private upstream secret');
    expect(message).not.toContain('credenciais');
    expect(message).not.toContain('link');
  });
  it.each([400, 401, 404, 500])(
    'preserves existing domain/credential fallback for %s',
    (status) => {
      expect(
        verificationFailureMessage({ isAxiosError: true, response: { status } }),
      ).toBeUndefined();
    },
  );
  it('ignores arbitrary errors and raw messages', () => {
    expect(verificationFailureMessage(new Error('private diagnostic'))).toBeUndefined();
  });
});
