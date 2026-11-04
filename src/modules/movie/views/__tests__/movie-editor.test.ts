import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive, defineComponent } from 'vue';
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils';
import type Movie from 'src/core/domain/movie/movie';
import { useMovieContext } from '../../composables/useMovieContext';
import MovieEditView from '../MovieEditView.vue';

const mocks = vi.hoisted(() => ({
  route: {
    name: 'movie-edit',
    path: '/movie/edit/a',
    params: { id: 'a' } as Record<string, string>,
  },
  user: { user: { id: 'owner', isLoged: true }, isAdmin: false },
  store: { moviePage: { selectedMovie: {} as Movie } },
  getMovie: vi.fn(),
  updateMovie: vi.fn(),
  push: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie/stores/MovieStore', () => ({ useMovieStore: () => mocks.store }));
vi.mock('src/modules/movie/services/MovieService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
const Form = defineComponent({
  name: 'MovieForm',
  setup(_, { expose }) {
    const draft = useMovieContext();
    expose({ hasErrors: async () => false });
    return { draft };
  },
  template: '<input aria-label="Título" v-model="draft.portuguese_title" />',
});
const wrappers: VueWrapper[] = [];
const record = (title = 'Original'): Movie => ({
  id: 'a',
  user_id: 'owner',
  portuguese_title: title,
  genres: [{ id: 1, name: 'Drama' }],
});
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function create() {
  const wrapper = shallowMount(MovieEditView, {
    global: {
      stubs: {
        BaseContainerMain: { template: '<main><slot /></main>' },
        MovieForm: Form,
        MovieSaveBtnGroup: {
          name: 'MovieSaveBtnGroup',
          template:
            '<div><button @click="$emit(\'save\')">Salvar</button><button @click="$emit(\'cancel\')">Cancelar</button></div>',
        },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.route = reactive({ name: 'movie-edit', path: '/movie/edit/a', params: { id: 'a' } });
  mocks.user = reactive({ user: { id: 'owner', isLoged: true }, isAdmin: false });
  mocks.store = reactive({ moviePage: { selectedMovie: record() } });
  mocks.getMovie.mockResolvedValue(record());
  mocks.updateMovie.mockImplementation(async (value: Movie) => value);
  mocks.push.mockResolvedValue(undefined);
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

test('cached edit uses an isolated draft and has no late initial GET to overwrite typing', async () => {
  const wrapper = await create();
  await wrapper.get('input').setValue('Unsaved');
  expect(mocks.getMovie).not.toHaveBeenCalled();
  expect(mocks.store.moviePage.selectedMovie.portuguese_title).toBe('Original');
  expect(wrapper.get('input').element.value).toBe('Unsaved');
});
test('confirming cancel discards the draft without sending update or mutating canonical data', async () => {
  const wrapper = await create();
  await wrapper.get('input').setValue('Unsaved');
  wrapper.findComponent({ name: 'BaseConfirmDialog' }).vm.$emit('ok');
  await flushPromises();
  expect(mocks.updateMovie).not.toHaveBeenCalled();
  expect(mocks.store.moviePage.selectedMovie.portuguese_title).toBe('Original');
  expect(mocks.push).toHaveBeenCalledWith('/movie/a');
});
test('save submits one established payload while repeated submits are pending', async () => {
  const wrapper = await create();
  await wrapper.get('input').setValue('Updated');
  const write = pending<Movie>();
  mocks.updateMovie.mockReturnValue(write.promise);
  const save = wrapper.findComponent({ name: 'MovieSaveBtnGroup' });
  save.vm.$emit('save');
  save.vm.$emit('save');
  await flushPromises();
  expect(mocks.updateMovie).toHaveBeenCalledTimes(1);
  expect(mocks.updateMovie.mock.calls[0]![0]).toMatchObject({
    id: 'a',
    portuguese_title: 'Updated',
    genres: [1],
  });
  write.resolve(record('Confirmed'));
  await flushPromises();
  expect(mocks.store.moviePage.selectedMovie.portuguese_title).toBe('Confirmed');
  expect(mocks.push).toHaveBeenCalledWith('/movie/a');
});
test('a pending save cannot mutate the canonical record or redirect after account change', async () => {
  const wrapper = await create();
  const write = pending<Movie>();
  mocks.updateMovie.mockReturnValue(write.promise);
  wrapper.findComponent({ name: 'MovieSaveBtnGroup' }).vm.$emit('save');
  await flushPromises();
  mocks.user.user.id = 'another-account';
  await flushPromises();
  write.resolve(record('Old account result'));
  await flushPromises();
  expect(mocks.store.moviePage.selectedMovie.portuguese_title).toBe('Original');
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.showSuccess).not.toHaveBeenCalled();
});
test('initial GET failures cannot surface or redirect after leaving the route', async () => {
  const read = pending<Movie>();
  mocks.store.moviePage.selectedMovie = {};
  mocks.getMovie.mockReturnValue(read.promise);
  const wrapper = await create();
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(true);
  mocks.route.path = '/profile';
  mocks.route.name = 'profile';
  mocks.route.params = {};
  await flushPromises();
  read.reject(new Error('old failure'));
  await flushPromises();
  expect(wrapper.text()).not.toContain('Não foi possível');
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.showError).not.toHaveBeenCalled();
});
test('nonowners cannot submit movie edits through the screen', async () => {
  mocks.user.user.id = 'other';
  const wrapper = await create();
  expect(wrapper.text()).toContain('Somente o autor');
  expect(wrapper.findComponent({ name: 'MovieSaveBtnGroup' }).exists()).toBe(false);
  expect(mocks.updateMovie).not.toHaveBeenCalled();
});

test('initial editor skeleton becomes error, retry skeleton, then editable content', async () => {
  mocks.store.moviePage.selectedMovie = {};
  const first = pending<Movie>();
  mocks.getMovie.mockReturnValue(first.promise);
  const wrapper = await create();
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(true);
  first.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(false);
  expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  const retry = pending<Movie>();
  mocks.getMovie.mockReturnValue(retry.promise);
  await wrapper.get('[role="alert"] button').trigger('click');
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(true);
  retry.resolve(record());
  await flushPromises();
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(false);
  expect(wrapper.get('input').element.value).toBe('Original');
});

test('read-only film shows loading anatomy, error and retry without stale content', async () => {
  const { default: MovieView } = await import('../MovieView.vue');
  mocks.route.name = 'movie';
  mocks.route.path = '/movie/a';
  const first = pending<Movie>();
  mocks.getMovie.mockReturnValue(first.promise);
  const wrapper = shallowMount(MovieView, {
    global: {
      stubs: {
        BaseContainerMain: { template: '<main><slot /></main>' },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  });
  wrappers.push(wrapper);
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'MovieForm' }).exists()).toBe(false);
  expect(wrapper.get('a').text()).toContain('Coleção');
  first.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(false);
  const retry = pending<Movie>();
  mocks.getMovie.mockReturnValue(retry.promise);
  await wrapper.get('[role="alert"] button').trigger('click');
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(true);
  retry.resolve(record());
  await flushPromises();
  expect(wrapper.findComponent({ name: 'MoviePageSkeleton' }).exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'MovieForm' }).exists()).toBe(true);
});
