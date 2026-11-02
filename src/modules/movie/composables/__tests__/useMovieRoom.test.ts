import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const mocks = vi.hoisted(() => {
  const handlers = new Map<string, Set<() => void>>();
  const socket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: () => void) => {
      handlers.get(event)?.delete(handler);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  return { socket, handlers, state: { token: '' } };
});
vi.mock('src/boot/socket', () => ({ socketMovie: mocks.socket, stateSocketMovie: mocks.state }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.handlers.clear();
  mocks.socket.connected = false;
  mocks.state.token = '';
  mocks.socket.connect.mockImplementation(() => {
    mocks.socket.connected = true;
    mocks.handlers.get('connect')?.forEach((fn) => fn());
  });
  mocks.socket.disconnect.mockImplementation(() => {
    mocks.socket.connected = false;
    mocks.handlers.get('disconnect')?.forEach((fn) => fn());
  });
});
async function fixtures() {
  const { useMovieRoom } = await import('../useMovieRoom');
  function consumer(id: string | undefined, credential = 'account-token') {
    const room = ref(id),
      token = ref(credential);
    let join!: () => void;
    const wrapper = mount(
      defineComponent({
        setup() {
          ({ join } = useMovieRoom(
            () => room.value,
            () => token.value,
          ));
          return () => null;
        },
      }),
    );
    return { wrapper, room, token, join: () => join() };
  }
  return consumer;
}
describe('movie room ownership', () => {
  it('transfers an existing connection to a new route without disconnecting it', async () => {
    const consumer = await fixtures();
    const old = consumer('old-movie');
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('join-room', { room: 'old-movie' });
    const next = consumer('new-movie');
    expect(mocks.socket.disconnect).not.toHaveBeenCalled();
    expect(mocks.socket.connect).toHaveBeenCalledTimes(1);
    expect(mocks.socket.emit.mock.calls.slice(-2)).toEqual([
      ['leave-room', { room: 'old-movie' }],
      ['join-room', { room: 'new-movie' }],
    ]);
    expect(mocks.handlers.get('connect')?.size).toBe(1);
    old.wrapper.unmount();
    expect(mocks.socket.disconnect).not.toHaveBeenCalled();
    old.join();
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('join-room', { room: 'new-movie' });
    next.wrapper.unmount();
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('leave-room', { room: 'new-movie' });
    expect(mocks.socket.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.handlers.get('connect')?.size).toBe(0);
    expect(mocks.handlers.get('disconnect')?.size).toBe(0);
  });
  it('leaves the previous room when a reused component changes IDs and does not duplicate joins', async () => {
    const consumer = await fixtures(),
      current = consumer('first');
    current.room.value = 'second';
    await flushPromises();
    expect(mocks.socket.emit.mock.calls.slice(-2)).toEqual([
      ['leave-room', { room: 'first' }],
      ['join-room', { room: 'second' }],
    ]);
    const count = mocks.socket.emit.mock.calls.length;
    current.join();
    expect(mocks.socket.emit).toHaveBeenCalledTimes(count);
    current.room.value = undefined;
    await flushPromises();
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('leave-room', { room: 'second' });
    expect(mocks.socket.disconnect).not.toHaveBeenCalled();
    current.wrapper.unmount();
  });
  it('joins after a delayed initial room appears and rejoins after reconnect', async () => {
    const consumer = await fixtures(),
      current = consumer(undefined);
    expect(mocks.socket.connect).not.toHaveBeenCalled();
    current.room.value = 'loaded';
    await flushPromises();
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('join-room', { room: 'loaded' });
    mocks.socket.connected = false;
    mocks.handlers.get('disconnect')?.forEach((fn) => fn());
    mocks.socket.connected = true;
    mocks.handlers.get('connect')?.forEach((fn) => fn());
    expect(mocks.socket.emit.mock.calls.filter(([event]) => event === 'join-room')).toHaveLength(2);
    current.wrapper.unmount();
  });
  it('transfers the connect listener while the namespace is still handshaking', async () => {
    mocks.socket.connect.mockImplementation(() => undefined);
    const consumer = await fixtures(),
      old = consumer('old'),
      next = consumer('new');
    old.wrapper.unmount();
    mocks.socket.connected = true;
    mocks.handlers.get('connect')?.forEach((fn) => fn());
    expect(mocks.socket.emit.mock.calls).toEqual([['join-room', { room: 'new' }]]);
    expect(mocks.socket.disconnect).not.toHaveBeenCalled();
    next.wrapper.unmount();
  });
  it('disconnects on logout and only rejoins after a new credential is available', async () => {
    const consumer = await fixtures(),
      current = consumer('movie');
    current.token.value = '';
    await flushPromises();
    expect(mocks.state.token).toBe('');
    expect(mocks.socket.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('leave-room', { room: 'movie' });
    current.token.value = 'new-token';
    await flushPromises();
    expect(mocks.state.token).toBe('new-token');
    expect(mocks.socket.emit).toHaveBeenLastCalledWith('join-room', { room: 'movie' });
    current.wrapper.unmount();
  });
});
