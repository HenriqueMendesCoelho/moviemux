import { onMounted, onBeforeUnmount, watch } from 'vue';
import { socketMovie } from 'src/boot/socket';

type RoomOwner = {
  identity: symbol;
  releaseRoom: () => void;
  connected: () => void;
  disconnected: () => void;
};
// Nuxt transitions may overlap route trees. Transfer the existing namespace rather
// than disconnect/reconnect its shared Manager while the successor is mounting.
let currentOwner: RoomOwner | undefined;

export function useMovieRoom(
  getRoom: () => string | undefined,
  getSessionGeneration: () => string,
) {
  const identity = Symbol('movie-room');
  let joinedRoom: string | undefined;
  function ownsRoom() {
    return currentOwner?.identity === identity;
  }
  function releaseRoom() {
    if (joinedRoom && socketMovie.connected) socketMovie.emit('leave-room', { room: joinedRoom });
    joinedRoom = undefined;
  }
  function join() {
    if (!ownsRoom()) return;
    const room = getRoom();
    const generation = getSessionGeneration();
    if (!room || !generation) {
      releaseRoom();
      // An empty session generation means logout. Ordinary room changes retain transport.
      if (!generation && socketMovie.connected) socketMovie.disconnect();
      return;
    }
    if (!socketMovie.connected) {
      socketMovie.connect();
      return; // The connect listener joins after the namespace handshake succeeds.
    }
    if (joinedRoom === room) return;
    releaseRoom();
    socketMovie.emit('join-room', { room });
    joinedRoom = room;
  }
  function connected() {
    if (!ownsRoom()) return;
    // Server-side memberships are lost on reconnect, even when the desired ID is unchanged.
    joinedRoom = undefined;
    join();
  }
  function disconnected() {
    joinedRoom = undefined;
  }
  onMounted(() => {
    if (currentOwner) {
      currentOwner.releaseRoom();
      socketMovie.off('connect', currentOwner.connected);
      socketMovie.off('disconnect', currentOwner.disconnected);
    }
    currentOwner = { identity, releaseRoom, connected, disconnected };
    socketMovie.on('connect', connected);
    socketMovie.on('disconnect', disconnected);
    join();
  });
  watch([getRoom, getSessionGeneration], join);
  onBeforeUnmount(() => {
    socketMovie.off('connect', connected);
    socketMovie.off('disconnect', disconnected);
    if (!ownsRoom()) return;
    releaseRoom();
    currentOwner = undefined;
    socketMovie.disconnect();
  });
  return { join };
}
