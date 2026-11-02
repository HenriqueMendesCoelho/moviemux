/** Executes the generated worker with mocked browser primitives; not browser acceptance. */
import vm from 'node:vm';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(process.env.PWA_PUBLIC_DIR || '.output/public');
const origin = 'http://127.0.0.1:3000';
type RequestInput = Request | string;
type WorkerEvent = {
  type: string;
  request?: Request;
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith?: (promise: Promise<Response>) => void;
};
const handlers = new Map<string, ((event: WorkerEvent) => void)[]>();
class MemoryCache {
  readonly entries = new Map<string, Response>();
  async put(request: RequestInput, response: Response) {
    this.entries.set(typeof request === 'string' ? request : request.url, response.clone());
  }
  async match(request: RequestInput, options: { ignoreSearch?: boolean } = {}) {
    const url = typeof request === 'string' ? new URL(request, origin).href : request.url;
    for (const [key, response] of this.entries) {
      if (key === url || (options.ignoreSearch && key.split('?')[0] === url.split('?')[0]))
        return response.clone();
    }
  }
  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
  async delete(request: RequestInput) {
    return this.entries.delete(typeof request === 'string' ? request : request.url);
  }
}
const stores = new Map<string, MemoryCache>();
const caches = {
  async open(name: string) {
    if (!stores.has(name)) stores.set(name, new MemoryCache());
    return stores.get(name)!;
  },
  async keys() {
    return [...stores.keys()];
  },
  async delete(name: string) {
    return stores.delete(name);
  },
  async match(request: RequestInput, options?: { ignoreSearch?: boolean }) {
    for (const cache of stores.values()) {
      const response = await cache.match(request, options);
      if (response) return response;
    }
  },
};
let offline = false;
const context: Record<string, unknown> = {
  FetchEvent: class FetchEvent {},
  console,
  URL,
  Request,
  Response,
  Headers,
  Promise,
  Map,
  Set,
  Date,
  Error,
  TypeError,
  RegExp,
  setTimeout,
  clearTimeout,
  performance,
  caches,
  location: new URL('/sw.js', origin),
  registration: { scope: origin + '/' },
  clients: { claim: async () => {}, matchAll: async () => [] },
  skipWaiting: async () => {},
  fetch: async (request: RequestInput) => {
    if (offline) throw new TypeError('Simulated offline network');
    const url = new URL(typeof request === 'string' ? request : request.url, origin);
    const file = join(root, url.pathname);
    return existsSync(file) && statSync(file).isFile()
      ? new Response(readFileSync(file), { status: 200 })
      : new Response('<html>Online application</html>', {
          headers: { 'content-type': 'text/html' },
        });
  },
  addEventListener(name: string, handler: (event: WorkerEvent) => void) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name)!.push(handler);
  },
};
context.self = context;
context.globalThis = context;
const sandbox = vm.createContext(context);
context.importScripts = (url: string) =>
  vm.runInContext(readFileSync(join(root, new URL(url, origin).pathname), 'utf8'), sandbox);
vm.runInContext(readFileSync(join(root, 'sw.js'), 'utf8'), sandbox);
await new Promise((resolveReady) => setTimeout(resolveReady, 20));
async function lifecycle(type: string) {
  const waits: Promise<unknown>[] = [];
  for (const handler of handlers.get(type) || [])
    handler({ type, waitUntil: (promise) => waits.push(promise) });
  await Promise.all(waits);
}
await lifecycle('install');
await lifecycle('activate');
async function navigate(path: string) {
  const request = new Request(origin + path);
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  let result: Promise<Response> | undefined;
  const waits: Promise<unknown>[] = [];
  for (const handler of handlers.get('fetch') || [])
    handler({
      type: 'fetch',
      request,
      waitUntil: (promise) => waits.push(promise),
      respondWith: (promise) => {
        result = promise;
      },
    });
  const response = await result;
  await Promise.all(waits);
  return response;
}
assert.match(await (await navigate('/home'))!.text(), /Online application/);
assert.equal(await navigate('/api/user'), undefined, 'API navigation must not be captured');
offline = true;
const response = await navigate('/home');
assert.equal(response?.status, 200);
assert.match(await response!.text(), /Um intervalo na sessão/);
const cached = [...stores.values()].flatMap((cache) => [...cache.entries.keys()]);
assert(!cached.some((url) => ['/home', '/api/user'].includes(new URL(url).pathname)));
console.log(
  'PASS: generated worker initializes, installs, activates and serves online/offline navigation without caching private HTML/API. Browser primitives mocked; native browser acceptance remains separate.',
);
