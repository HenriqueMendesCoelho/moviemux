import { reactive } from 'vue';
import { io } from 'socket.io-client';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;

export const stateSocketAllMovies = reactive({
  connected: false,
  updateEvents: [] as { event: string }[],
  hasToExecuteUpdate: false,
});

export const socketAllMovies = io(`${BASE_URL}/movie/all`, {
  auth: (cb) => {
    cb({
      token: localStorage.getItem('auth-kb'),
    });
  },
  path: '/ws',
  autoConnect: false,
  secure: true,
});

socketAllMovies.on('connect', () => {
  stateSocketAllMovies.connected = true;
});

socketAllMovies.on('disconnect', () => {
  stateSocketAllMovies.connected = false;
});

socketAllMovies.on('update', (args: { event: string }) => {
  stateSocketAllMovies.updateEvents.push(args);
  stateSocketAllMovies.hasToExecuteUpdate = true;
});
