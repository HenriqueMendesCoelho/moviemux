import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import type Movie from 'src/core/domain/movie/movie';
import type { MovieNoteType } from 'src/core/types/movie/MovieType';
import MovieTableNotes from '../MovieTableNotes.vue';
const mocks = vi.hoisted(() => ({
  route: { path: '/movie/a', name: 'movie' },
  user: { user: { id: 'owner', isLoged: true }, isAdmin: false },
  store: { moviePage: { selectedMovie: {} as Movie } },
  socket: {
    connected: true,
    createNote: [] as { movie: string; content: MovieNoteType }[],
    updateNote: [] as { movie: string; content: MovieNoteType }[],
    deleteNote: [] as { movie: string; content: MovieNoteType }[],
    updateMovie: [] as { movie: string }[],
  },
  getMovieNotes: vi.fn(),
  getMovie: vi.fn(),
  updateMovie: vi.fn(),
  updateMovieNotes: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie/stores/MovieStore', () => ({ useMovieStore: () => mocks.store }));
vi.mock('src/modules/movie/services/MovieService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('src/boot/socket', async () => {
  const { reactive } = await import('vue');
  mocks.socket = reactive(mocks.socket);
  return { stateSocketMovie: mocks.socket };
});
vi.mock('../../composables/useMovieRoom', () => ({ useMovieRoom: () => ({ join: vi.fn() }) }));
const wrappers: VueWrapper[] = [];
function note(id: string, value?: number): MovieNoteType {
  return {
    user: { id, name: id },
    note: value,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
const movie = () => mocks.store.moviePage.selectedMovie;
async function create() {
  const wrapper = shallowMount(MovieTableNotes, {
    props: { movieId: 'a' },
    global: { stubs: { BaseModal: { template: '<div><slot /></div>' } } },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
function score(wrapper: VueWrapper, name: string) {
  return wrapper
    .findAll('tbody tr')
    .find((row) => row.find('td').text().includes(name))
    ?.find('strong')
    .text();
}
beforeEach(() => {
  vi.clearAllMocks();
  // Keep socket identity: mocked ES module exports this same object.
  Object.assign(
    mocks.socket,
    reactive({ connected: true, createNote: [], updateNote: [], deleteNote: [], updateMovie: [] }),
  );
  mocks.store = reactive({
    moviePage: {
      selectedMovie: { id: 'a', user_id: 'owner', show_notes: false, notes: [note('owner', 0)] },
    },
  });
  mocks.user = reactive({ user: { id: 'owner', isLoged: true }, isAdmin: false });
  mocks.getMovie.mockImplementation(async () => ({ ...movie() }));
  mocks.getMovieNotes.mockImplementation(async () => movie().notes);
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
test('own hidden echo after save preserves zero while personalized fetch is pending', async () => {
  const wrapper = await create();
  let resolve!: (notes: MovieNoteType[]) => void;
  mocks.getMovieNotes.mockReturnValue(
    new Promise<MovieNoteType[]>((r) => {
      resolve = r;
    }),
  );
  mocks.socket.updateNote.push({ movie: 'a', content: note('owner') });
  await flushPromises();
  expect(score(wrapper, 'owner')).toBe('0');
  expect(mocks.getMovieNotes).toHaveBeenCalledWith('a');
  resolve([note('owner', 0)]);
  await flushPromises();
  expect(score(wrapper, 'owner')).toBe('0');
});
test('hidden other live inserts deduplicate names and never expose a stale numeric payload', async () => {
  const wrapper = await create();
  mocks.socket.createNote.push({ movie: 'a', content: note('other', 9) });
  await flushPromises();
  mocks.socket.updateNote.push({ movie: 'a', content: note('other') });
  await flushPromises();
  expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  expect(score(wrapper, 'other')).toBe('—');
  expect(score(wrapper, 'owner')).toBe('0');
  movie().show_notes = true;
  mocks.socket.updateNote.push({ movie: 'a', content: note('other', 0) });
  await flushPromises();
  expect(score(wrapper, 'other')).toBe('0');
});
test('visibility event hides stale other scores immediately then fetches personalized canonical state', async () => {
  movie().show_notes = true;
  movie().notes!.push(note('other', 9));
  const wrapper = await create();
  let resolve!: (record: Movie) => void;
  mocks.getMovie.mockReturnValue(
    new Promise<Movie>((r) => {
      resolve = r;
    }),
  );
  mocks.getMovieNotes.mockResolvedValue([note('owner', 0), note('other')]);
  mocks.socket.updateMovie.push({ movie: 'a' });
  await flushPromises();
  expect(score(wrapper, 'other')).toBe('—');
  resolve({ id: 'a', show_notes: false });
  await flushPromises();
  expect(movie().show_notes).toBe(false);
  expect(score(wrapper, 'owner')).toBe('0');
});
test('wrong movie events and unmounted listeners do not mutate notes', async () => {
  const wrapper = await create();
  mocks.socket.createNote.push({ movie: 'wrong', content: note('other', 7) });
  await flushPromises();
  expect(movie().notes).toHaveLength(1);
  wrapper.unmount();
  mocks.socket.createNote.push({ movie: 'a', content: note('other', 7) });
  await flushPromises();
  expect(movie().notes).toHaveLength(1);
});
test('hidden own echo during save queues canonical fetch until mutation completes', async () => {
  const wrapper = await create();
  let resolve!: (note: MovieNoteType) => void;
  mocks.updateMovieNotes.mockReturnValue(
    new Promise<MovieNoteType>((r) => {
      resolve = r;
    }),
  );
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Editar')!
    .trigger('click');
  await wrapper.get('#movie-note').setValue('0');
  await wrapper.get('form').trigger('submit');
  mocks.socket.updateNote.push({ movie: 'a', content: note('owner') });
  await flushPromises();
  expect(mocks.getMovieNotes).not.toHaveBeenCalled();
  resolve(note('owner', 0));
  await flushPromises();
  expect(mocks.getMovieNotes).toHaveBeenCalledWith('a');
  expect(score(wrapper, 'owner')).toBe('0');
});
test('reconnect refetches privacy before showing any previously visible other score', async () => {
  movie().show_notes = true;
  movie().notes!.push(note('other', 9));
  const wrapper = await create();
  mocks.socket.connected = false;
  await flushPromises();
  expect(score(wrapper, 'other')).toBe('—');
  mocks.getMovie.mockResolvedValue({ id: 'a', show_notes: false });
  mocks.getMovieNotes.mockResolvedValue([note('owner', 0), note('other')]);
  mocks.socket.connected = true;
  await flushPromises();
  expect(mocks.getMovie).toHaveBeenCalledWith('a');
  expect(score(wrapper, 'other')).toBe('—');
});
test('29:59 server age hides the toggle exactly at 30:00 regardless of timestamp timezone', async () => {
  vi.useFakeTimers();
  try {
    movie().time_since_creation = 1799;
    movie().created_at = new Date('2026-11-02T00:00:00+11:00');
    const wrapper = await create();
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    mocks.getMovie.mockResolvedValue({ id: 'a', show_notes: true, time_since_creation: 1800 });
    await vi.advanceTimersByTimeAsync(999);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    expect(mocks.getMovie).toHaveBeenCalledWith('a');
    expect(movie().show_notes).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});
test('stale server age cannot reopen an expired control or extend its anchored window', async () => {
  vi.useFakeTimers();
  try {
    movie().time_since_creation = 1799;
    const wrapper = await create();
    mocks.getMovie.mockResolvedValue({ id: 'a', show_notes: true, time_since_creation: 1800 });
    await vi.advanceTimersByTimeAsync(500);
    movie().time_since_creation = 1798;
    await flushPromises();
    movie().time_since_creation = 1799;
    await flushPromises();
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    expect(mocks.getMovie).toHaveBeenCalledTimes(1);
    movie().time_since_creation = 1799;
    await flushPromises();
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(mocks.getMovie).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
test('empty reviews show one invitation without sorting or page-size controls', async () => {
  movie().notes = [];
  const wrapper = await create();
  expect(wrapper.findAll('select')).toHaveLength(0);
  expect(
    wrapper.findAll('button').filter((button) => button.text() === 'Avaliar filme'),
  ).toHaveLength(1);
  expect(wrapper.text()).toContain('A primeira opinião pode ser sua');
});

test('ratings emphasize identity and score while secondary dates and own actions stay disclosed', async () => {
  movie().notes!.push(note('other', 8));
  const wrapper = await create();
  expect(wrapper.findAll('thead th')).toHaveLength(3);
  expect(wrapper.findAll('.mm-review-menu')).toHaveLength(1);
  expect(wrapper.find('.mm-review-menu').attributes('open')).toBeUndefined();
  expect(wrapper.find('.mm-review-count').text()).toBe('2');
  expect(wrapper.findAll('.mm-review-dates')).toHaveLength(2);
  expect(wrapper.find('.mm-review-controls').text()).not.toContain('Por página');
  expect(score(wrapper, 'owner')).toBe('0');
  expect(score(wrapper, 'other')).toBe('—');
});

test('score sorting is explicitly unavailable until reveal and falls back when privacy closes', async () => {
  movie().notes![0]!.user.name = 'Alpha';
  const other = note('other', 8);
  other.user.name = 'Zeta';
  movie().notes!.push(other);
  const wrapper = await create();
  const select = wrapper.get('select[aria-label="Ordenar avaliações"]');
  expect(wrapper.get('option[value="note"]').attributes('disabled')).toBeDefined();
  expect(wrapper.get('option[value="note"]').text()).toBe('Maior nota — disponível após revelar');
  movie().show_notes = true;
  await flushPromises();
  expect(wrapper.get('option[value="note"]').attributes('disabled')).toBeUndefined();
  await select.setValue('note');
  expect(wrapper.findAll('tbody tr')[0]!.text()).toContain('Zeta');
  movie().show_notes = false;
  await flushPromises();
  expect((select.element as HTMLSelectElement).value).toBe('name');
  expect(wrapper.findAll('tbody tr')[0]!.text()).toContain('Alpha');
  expect(score(wrapper, 'Zeta')).toBe('—');
  movie().show_notes = true;
  await flushPromises();
  await select.setValue('note');
  mocks.socket.connected = false;
  await flushPromises();
  expect(wrapper.get('option[value="note"]').attributes('disabled')).toBeDefined();
  expect((select.element as HTMLSelectElement).value).toBe('name');
});
