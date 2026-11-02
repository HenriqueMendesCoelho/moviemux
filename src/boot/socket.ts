import { reactive } from 'vue';
import { io, type Socket } from 'socket.io-client';
import type { MovieNoteType } from 'src/core/types/movie/MovieType';

let all: Socket | undefined;
let movie: Socket | undefined;
function proxySocket(resolve: () => Socket | undefined): Socket {
  return new Proxy({} as Socket, {
    get(_target, key) {
      const socket = resolve();
      if (!socket) return key === 'connected' ? false : () => undefined;
      const value = Reflect.get(socket, key);
      return typeof value === 'function' ? value.bind(socket) : value;
    },
  });
}
export const socketAllMovies = proxySocket(() => all);
export const socketMovie = proxySocket(() => movie);

type eventMovieNote = {
  event: string;
  movie: string;
  content: MovieNoteType;
  emmitedByUserId?: string;
};

export const stateSocketAllMovies = reactive({
  connected: false,
  updateEvents: [] as { event: string }[],
  hasToExecuteUpdate: false,
  token: '',
});

export function initializeSockets(baseUrl: string) {
  if (all || !import.meta.client) return;
  all = io(`${baseUrl}/movie/all`, {
    autoConnect: false,
    // Independent lifecycles prevent shared-manager reconnect races between namespaces.
    forceNew: true,
    auth: (cb) => {
      cb({
        token: stateSocketAllMovies.token,
      });
    },
    path: '/ws',
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
}

export const stateSocketMovie = reactive({
  connected: false,
  updateMovie: [] as eventMovieNote[],
  createNote: [] as eventMovieNote[],
  updateNote: [] as eventMovieNote[],
  deleteNote: [] as eventMovieNote[],
  deletedMovie: [] as eventMovieNote[],
  token: '',
});

export function initializeMovieSocket(baseUrl: string) {
  if (movie || !import.meta.client) return;
  movie = io(`${baseUrl}/movie/note`, {
    autoConnect: false,
    // Independent lifecycles prevent shared-manager reconnect races between namespaces.
    forceNew: true,
    auth: (cb) => {
      cb({
        token: stateSocketMovie.token,
      });
    },
    path: '/ws',
    secure: true,
  });

  socketMovie.on('connect', () => {
    stateSocketMovie.connected = true;
  });

  socketMovie.on('disconnect', () => {
    stateSocketMovie.connected = false;
  });

  socketMovie.on('update-movie', (args: eventMovieNote) => {
    stateSocketMovie.updateMovie.push(args);
  });

  socketMovie.on('create-note', (args: eventMovieNote) => {
    stateSocketMovie.createNote.push(args);
  });

  socketMovie.on('update-note', (args: eventMovieNote) => {
    stateSocketMovie.updateNote.push(args);
  });

  socketMovie.on('delete-note', (args: eventMovieNote) => {
    stateSocketMovie.deleteNote.push(args);
  });

  socketMovie.on('deleted-movie', (args: eventMovieNote) => {
    stateSocketMovie.deletedMovie.push(args);
  });
}

/** Clear account-scoped events and credentials before another session can subscribe. */
export function resetSocketSession(token = '') {
  const reconnectAll = Boolean(all?.connected && token);
  const reconnectMovie = Boolean(movie?.connected && token);
  all?.disconnect();
  movie?.disconnect();
  stateSocketAllMovies.connected = false;
  stateSocketAllMovies.token = token;
  stateSocketAllMovies.updateEvents = [];
  stateSocketAllMovies.hasToExecuteUpdate = false;
  stateSocketMovie.connected = false;
  stateSocketMovie.token = token;
  stateSocketMovie.updateMovie = [];
  stateSocketMovie.createNote = [];
  stateSocketMovie.updateNote = [];
  stateSocketMovie.deleteNote = [];
  stateSocketMovie.deletedMovie = [];
  if (reconnectAll) all?.connect();
  if (reconnectMovie) movie?.connect();
}
