import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const sockets: {
    connected: boolean;
    handlers: Map<string, Handler[]>;
    options: { auth: (callback: (auth: { csrf: string }) => void) => void };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  }[] = [];
  const io = vi.fn(
    (_url: string, options: { auth: (callback: (auth: { csrf: string }) => void) => void }) => {
      const socket = {
        connected: false,
        handlers: new Map<string, Handler[]>(),
        options,
        connect: vi.fn(),
        disconnect: vi.fn(),
        on: vi.fn(),
      };
      socket.on.mockImplementation((name: string, handler: Handler) => {
        socket.handlers.set(name, [...(socket.handlers.get(name) || []), handler]);
        return socket;
      });
      socket.connect.mockImplementation(() => {
        socket.connected = true;
        socket.handlers.get('connect')?.forEach((fn) => fn());
        return socket;
      });
      socket.disconnect.mockImplementation(() => {
        socket.connected = false;
        socket.handlers.get('disconnect')?.forEach((fn) => fn());
        return socket;
      });
      sockets.push(socket);
      return socket;
    },
  );
  return { io, sockets };
});
vi.mock('socket.io-client', () => ({ io: mocks.io }));
beforeEach(() => {
  vi.resetModules();
  mocks.io.mockClear();
  mocks.sockets.splice(0);
});
describe('browser socket session lifecycle', () => {
  it('constructs no connections at import and initializes only once without auto-connect', async () => {
    const module = await import('../../src/boot/socket');
    expect(mocks.io).not.toHaveBeenCalled();
    module.initializeSockets();
    module.initializeSockets();
    module.initializeMovieSocket();
    expect(mocks.io).toHaveBeenCalledTimes(2);
    for (const call of mocks.io.mock.calls) {
      expect(call[1]).toMatchObject({ autoConnect: false, forceNew: true, path: '/ws' });
    }
    expect(mocks.sockets[0]?.connect).not.toHaveBeenCalled();
  });
  it('clears credentials/events and disconnects on logout without removing consumer listeners', async () => {
    const module = await import('../../src/boot/socket');
    module.initializeSockets();
    module.initializeMovieSocket();
    const listener = vi.fn();
    module.socketMovie.on('connect', listener);
    module.socketMovie.connect();
    module.stateSocketAllMovies.csrfToken = 'old-user';
    module.stateSocketAllMovies.updateEvents.push({ event: 'update' });
    module.stateSocketAllMovies.hasToExecuteUpdate = true;
    module.resetSocketSession();
    expect(module.stateSocketAllMovies.csrfToken).toBe('');
    expect(module.stateSocketMovie.csrfToken).toBe('');
    expect(module.stateSocketAllMovies.updateEvents).toEqual([]);
    expect(module.stateSocketAllMovies.hasToExecuteUpdate).toBe(false);
    expect(mocks.sockets.every((socket) => !socket.connected)).toBe(true);
    module.resetSocketSession('new-user');
    module.socketMovie.connect();
    expect(listener).toHaveBeenCalledTimes(2);
    const auth = vi.fn();
    mocks.sockets[1]!.options.auth(auth);
    expect(auth).toHaveBeenCalledWith({ csrf: 'new-user' });
  });
});
