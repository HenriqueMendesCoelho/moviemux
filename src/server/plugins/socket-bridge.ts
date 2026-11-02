import { Server as Engine } from 'engine.io';
import { Server, type Socket } from 'socket.io';
import { io as connectUpstream, type Socket as UpstreamSocket } from 'socket.io-client';
import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from 'nuxt/server';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readActiveSession, type ActiveSession } from '../utils/session';
import { isSessionRevoked, onSessionRevoked, revokeSession } from '../utils/session-registry';
import { assertTrustedOrigin, assertSessionCsrf, fixedUpstream } from '../utils/security';

// Narrow adapter boundary for Engine.IO's protected transport registry.
// Needed to bind polling/upgrade SIDs to the cookie that created the transport.
class SessionEngine extends Engine {
  requestForTransport(sid: string): IncomingMessage | undefined {
    return this.clients[sid]?.request;
  }
}

const namespaces = ['/movie/all', '/movie/note'] as const;
const movieEvents = [
  'update-movie',
  'create-note',
  'update-note',
  'delete-note',
  'deleted-movie',
] as const;
const roomPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requestFromNode(request: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  // This URL is never fetched. Cookie/session validation uses the original headers.
  return new Request(new URL(request.url || '/ws', 'http://socket-bridge.internal'), { headers });
}
function connectionError(code: 'SESSION_REQUIRED' | 'REALTIME_UNAVAILABLE') {
  return Object.assign(
    new Error(code === 'SESSION_REQUIRED' ? 'Session required' : 'Realtime unavailable'),
    { data: { code } },
  );
}
type Bridge = {
  session: ActiveSession;
  downstream: Socket;
  upstream: UpstreamSocket;
  room?: string;
  ready: boolean;
  closed: boolean;
  dispose: (endSession?: boolean) => void;
};

/** Node-only authenticated protocol bridge. JWTs never cross the downstream boundary. */
export default defineNitroPlugin((nitroApp) => {
  const bridges = new Set<Bridge>();
  let shuttingDown = false;
  const engine = new SessionEngine({ maxHttpBufferSize: 16_384 });
  const io = new Server({ maxHttpBufferSize: 16_384, connectionStateRecovery: undefined });
  io.bind(engine);
  async function assertTransportSession(
    request: Pick<Request, 'url' | 'headers'>,
    session: ActiveSession,
  ) {
    const sid = new URL(request.url).searchParams.get('sid');
    const originalRequest = sid ? engine.requestForTransport(sid) : undefined;
    if (!originalRequest) return;
    const original = await readActiveSession(requestFromNode(originalRequest));
    if (original.user.generation !== session.user.generation)
      throw new Error('Transport session mismatch');
  }
  // Polling requests, including existing transport IDs, must carry a live cookie.
  engine.use(
    async (request: IncomingMessage, _response: ServerResponse, next: (error?: Error) => void) => {
      try {
        const input = requestFromNode(request);
        assertTrustedOrigin(input.headers, { allowMissingRead: true });
        const session = await readActiveSession(input);
        await assertTransportSession(input, session);
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    },
  );
  const unsubscribe = onSessionRevoked((generation) => {
    for (const bridge of bridges)
      if (bridge.session.user.generation === generation) bridge.dispose(true);
  });
  function active(bridge: Bridge) {
    return (
      !bridge.closed &&
      bridge.session.user.expiresAt > Date.now() &&
      !isSessionRevoked(bridge.session.user.generation)
    );
  }
  for (const name of namespaces) {
    const namespace = io.of(name);
    namespace.use(async (downstream, next) => {
      let session: ActiveSession;
      try {
        const request = requestFromNode(downstream.request);
        assertTrustedOrigin(request.headers, { allowMissingRead: true });
        session = await readActiveSession(request);
        assertSessionCsrf(session.csrfToken, downstream.handshake.auth.csrf);
      } catch {
        next(connectionError('SESSION_REQUIRED'));
        return;
      }
      let endpoint: URL;
      try {
        endpoint = fixedUpstream(String(useRuntimeConfig().socketUpstream || ''));
      } catch {
        next(connectionError('REALTIME_UNAVAILABLE'));
        return;
      }
      if (downstream.conn.readyState !== 'open') return;
      const upstream = connectUpstream(`${endpoint.href.replace(/\/$/, '')}${name}`, {
        path: '/ws',
        autoConnect: false,
        forceNew: true,
        timeout: 7_000,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5_000,
        auth: { token: session.secure.accessToken },
      });
      let expiryTimer: ReturnType<typeof setTimeout>;
      let accepted = false;
      const bridge: Bridge = {
        session,
        downstream,
        upstream,
        ready: false,
        closed: false,
        dispose(endSession = false) {
          if (bridge.closed) return;
          bridge.closed = true;
          clearTimeout(expiryTimer);
          clearTimeout(handshakeTimer);
          bridges.delete(bridge);
          downstream.conn.off('close', onTransportClose);
          upstream.removeAllListeners();
          upstream.disconnect();
          upstream.auth = {};
          if (bridge.ready && endSession) downstream.emit('bridge:session-ended');
          if (shuttingDown) return;
          if (bridge.ready) downstream.disconnect(true);
          else if (!accepted) {
            accepted = true;
            next(connectionError(endSession ? 'SESSION_REQUIRED' : 'REALTIME_UNAVAILABLE'));
          }
        },
      };
      function onTransportClose() {
        bridge.dispose();
      }
      function expire() {
        const remaining = session.user.expiresAt - Date.now();
        if (remaining <= 0 || isSessionRevoked(session.user.generation)) bridge.dispose(true);
        else expiryTimer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
      }
      bridges.add(bridge);
      downstream.data.bridge = bridge;
      downstream.conn.once('close', onTransportClose);
      const handshakeTimer = setTimeout(() => bridge.dispose(), 10_000);
      expire();
      if (bridge.closed) return;
      upstream.on('connect', () => {
        if (!active(bridge)) {
          bridge.dispose(true);
          return;
        }
        clearTimeout(handshakeTimer);
        if (bridge.room) upstream.emit('join-room', { room: bridge.room });
        if (!accepted) {
          accepted = true;
          next();
        } else if (bridge.ready) {
          downstream.emit('bridge:upstream', { connected: true });
          if (name === '/movie/all') downstream.emit('update', { event: 'update' });
        }
      });
      upstream.on('disconnect', () => {
        if (bridge.ready && active(bridge))
          downstream.emit('bridge:upstream', { connected: false });
      });
      upstream.on('connect_error', (error: Error) => {
        if (!active(bridge) || error.message === 'not authorized') {
          if (error.message === 'not authorized')
            revokeSession(session.user.generation, session.user.expiresAt);
          bridge.dispose(true);
          return;
        }
        if (!accepted) bridge.dispose();
      });
      for (const event of name === '/movie/all' ? ['update'] : movieEvents) {
        upstream.on(event, (payload: unknown) => {
          if (!active(bridge)) {
            bridge.dispose(true);
            return;
          }
          if (!bridge.ready) return;
          if (name === '/movie/note') {
            if (
              !payload ||
              typeof payload !== 'object' ||
              !('movie' in payload) ||
              payload.movie !== bridge.room
            )
              return;
          }
          downstream.emit(event, payload);
        });
      }
      upstream.connect();
    });
    namespace.on('connection', (downstream) => {
      const bridge = downstream.data.bridge as Bridge | undefined;
      if (!bridge || !active(bridge)) {
        bridge?.dispose(true);
        downstream.disconnect(true);
        return;
      }
      bridge.ready = true;
      downstream.use((_packet, next) => {
        if (!active(bridge)) {
          bridge.dispose(true);
          next(new Error('Session expired'));
          return;
        }
        next();
      });
      if (name === '/movie/note') {
        downstream.on('join-room', (payload: unknown) => {
          if (
            !payload ||
            typeof payload !== 'object' ||
            !('room' in payload) ||
            typeof payload.room !== 'string' ||
            !roomPattern.test(payload.room)
          )
            return;
          const room = payload.room;
          if (bridge.room === room) return;
          if (bridge.room && bridge.upstream.connected)
            bridge.upstream.emit('leave-room', { room: bridge.room });
          bridge.room = room;
          if (bridge.upstream.connected) bridge.upstream.emit('join-room', { room });
        });
        downstream.on('leave-room', (payload: unknown) => {
          if (
            !payload ||
            typeof payload !== 'object' ||
            !('room' in payload) ||
            payload.room !== bridge.room
          )
            return;
          if (bridge.room && bridge.upstream.connected)
            bridge.upstream.emit('leave-room', { room: bridge.room });
          bridge.room = undefined;
        });
      }
      downstream.once('disconnect', () => bridge.dispose());
    });
  }
  nitroApp.router.use(
    '/ws/',
    defineEventHandler({
      handler(event) {
        engine.handleRequest(event.node.req, event.node.res);
        event._handled = true;
      },
      websocket: {
        async upgrade(request) {
          try {
            // The official Engine.IO adapter bypasses handleUpgrade/allowRequest.
            // Authenticate this path explicitly before CrossWS accepts the upgrade.
            assertTrustedOrigin(request.headers);
            const session = await readActiveSession(request);
            await assertTransportSession(request, session);
          } catch {
            return new Response('Unauthorized', { status: 403 });
          }
        },
        open(peer) {
          // Official Socket.IO/Nitro Node adapter; pinned Engine.IO private APIs.
          // @ts-expect-error private Engine.IO/CrossWS adapter surface
          engine.prepare(peer._internal.nodeReq);
          // @ts-expect-error private Engine.IO/CrossWS adapter surface
          engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
        },
      },
    }),
  );
  nitroApp.hooks.hook('close', async () => {
    shuttingDown = true;
    unsubscribe();
    // Close the transport, not the namespace: server restart/HMR must allow
    // automatic client reconnect. Logout/expiry retain explicit disconnects.
    engine.close();
    for (const bridge of bridges) bridge.dispose();
    await io.close();
  });
});
