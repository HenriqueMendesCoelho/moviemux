import { createError, type RequestEvent } from 'nuxt/server';
export async function boundedBody(
  event: RequestEvent,
  limit = 128 * 1024,
  strictUtf8 = false,
): Promise<string> {
  const declared = Number(event.req.headers.get('content-length') || 0);
  if (declared > limit) throw createError({ status: 413, message: 'Request too large' });
  const reader = event.req.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw createError({ status: 413, message: 'Request too large' });
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  return strictUtf8
    ? new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    : bytes.toString('utf8');
}
