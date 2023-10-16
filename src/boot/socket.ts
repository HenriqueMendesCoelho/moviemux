import { reactive } from 'vue';
import { io } from 'socket.io-client';
import { MovieNoteType } from 'src/types/movie/MovieType';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;

type eventMovieNote = { event: string; movie: string; content: MovieNoteType };

export const stateSocketAllMovies = reactive({
  connected: false,
  updateEvents: [] as { event: string }[],
  hasToExecuteUpdate: false,
  token: '',
});

export const socketAllMovies = io(`${BASE_URL}/movie/all`, {
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

export const stateSocketMovie = reactive({
  connected: false,
  updateMovie: [] as eventMovieNote[],
  createNote: [] as eventMovieNote[],
  updateNote: [] as eventMovieNote[],
  deleteNote: [] as eventMovieNote[],
  token: '',
});

export const socketMovie = io(`${BASE_URL}/movie/note`, {
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
