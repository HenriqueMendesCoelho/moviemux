import { expect, test, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  protect: vi.fn(),
  headers: vi.fn(),
  status: vi.fn(),
}));
vi.mock('h3', () => ({
  getRequestURL: (e: { path: string }) => new URL(e.path, 'http://localhost'),
  send: mocks.send,
  setResponseHeaders: mocks.headers,
  setResponseStatus: mocks.status,
}));
vi.mock('../../src/server/utils/private-response-cache', () => ({
  protectPrivateResponse: mocks.protect,
}));
import handler from '../../src/server/private-api-error';
test('keeps Nitro error sanitization and applies private policy after formatted headers', async () => {
  const event = { path: '/api/rankings/missing' } as unknown as H3Event;
  const error = new Error('private internal value') as H3Error;
  const response = {
    status: 500,
    statusText: 'Server Error',
    headers: { 'cache-control': 'no-cache' },
    body: { statusCode: 500, message: 'Server Error' },
  };
  const defaultHandler = vi.fn().mockResolvedValue(response);
  await handler(error, event, { defaultHandler });
  expect(defaultHandler).toHaveBeenCalledWith(error, event, { json: true });
  expect(mocks.headers).toHaveBeenCalledWith(event, response.headers);
  expect(mocks.status).toHaveBeenCalledWith(event, 500, 'Server Error');
  expect(mocks.protect).toHaveBeenCalledWith(event);
  expect(mocks.headers.mock.invocationCallOrder.at(-1)).toBeLessThan(
    mocks.protect.mock.invocationCallOrder.at(-1)!,
  );
  expect(mocks.send).toHaveBeenCalledWith(event, JSON.stringify(response.body));
  expect(mocks.send.mock.calls.at(-1)?.[1]).not.toContain('private internal value');
});
test('leaves page and socket errors to the existing renderer', async () => {
  const defaultHandler = vi.fn();
  for (const path of ['/rankings/missing', '/ws'])
    await handler(new Error() as H3Error, { path } as unknown as H3Event, { defaultHandler });
  expect(defaultHandler).not.toHaveBeenCalled();
});
