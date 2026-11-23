import { expect, test, vi } from 'vitest';
vi.mock('nuxt/server', () => ({
  createError: (value: Record<string, unknown>) =>
    Object.assign(new Error(String(value.message)), value),
}));
import { rankingRequestBody } from '../../src/server/utils/ranking-requests';
const id = '11111111-1111-4111-8111-111111111111',
  own = `/rankings/${id}/rounds/${id}/rating/me`;
const request = (body: unknown, method = 'POST') =>
  rankingRequestBody(own, method, JSON.stringify(body), 'application/json');
test.each([0, 10])('only exact integer %s score enters upstream', (score) => {
  for (const method of ['POST', 'PATCH'])
    expect(request({ score }, method)).toBe(JSON.stringify({ score }));
});
test.each([
  null,
  {},
  [],
  { score: null },
  { score: '0' },
  { score: true },
  { score: 0.5 },
  { score: -1 },
  { score: 11 },
  { score: 5, user_id: id },
  { score: 5, ranking_id: id },
])('rejects invalid or competing ownership body %j', (body) =>
  expect(() => request(body)).toThrow(),
);
test('only validated creation fields cross BFF, with code point length', () => {
  const body = { name: '  😀  ', visibility: 'PRIVATE', admission: 'INVITATION' };
  expect(rankingRequestBody('/rankings', 'POST', JSON.stringify(body), 'application/json')).toBe(
    JSON.stringify({ ...body, name: '😀' }),
  );
  for (const value of [
    { ...body, owner_id: id },
    { ...body, capabilities: ['READ'] },
    { ...body, name: ' ' },
    { ...body, name: '😀'.repeat(121) },
    { ...body, visibility: 'other' },
    { ...body, visibility: ['PRIVATE'] },
    { ...body, admission: ['INVITATION'] },
  ])
    expect(() =>
      rankingRequestBody('/rankings', 'POST', JSON.stringify(value), 'application/json'),
    ).toThrow();
});
test('rejects non JSON, malformed JSON and preserves unrelated APIs unchanged', () => {
  expect(() =>
    rankingRequestBody(own, 'POST', 'score=0', 'application/x-www-form-urlencoded'),
  ).toThrow();
  expect(() => rankingRequestBody(own, 'POST', '{', 'application/json')).toThrow();
  expect(
    rankingRequestBody('/user/wishlist', 'POST', 'name=Test', 'application/x-www-form-urlencoded'),
  ).toBe('name=Test');
});
test('invitation address rotation is bodyless, never actor supplied', () => {
  const path = '/user/ranking-invitation-address/rotate';
  expect(rankingRequestBody(path, 'POST', undefined, undefined)).toBeUndefined();
  for (const body of ['{}', 'null', '{"user_id":"other"}', ' '])
    expect(() => rankingRequestBody(path, 'POST', body, 'application/json')).toThrow();
});
test('invitation accept is bodyless and cannot supply membership grants', () => {
  const path = `/rankings/${id}/invitations/${id}/accept`;
  expect(rankingRequestBody(path, 'POST', undefined, undefined)).toBeUndefined();
  for (const body of ['{}', '{"capabilities":["READ"]}', 'null'])
    expect(() => rankingRequestBody(path, 'POST', body, 'application/json')).toThrow();
});
