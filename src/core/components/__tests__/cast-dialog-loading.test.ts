import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Credits } from 'src/core/types/movie/MovieType';
const mocks = vi.hoisted(() => ({ credits: vi.fn() }));
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://image.tmdb.org/t/p' } }),
}));
vi.mock('src/core/services/KitService', () => ({ default: { getMovieCredits: mocks.credits } }));
import Cast from '../BaseDialogCast.vue';
import Portrait from '../BasePersonPortrait.vue';
const result = (name = 'Pessoa'): Credits => ({
  cast: [
    {
      name,
      original_name: name,
      known_for_department: 'Acting',
      character: 'Papel',
      profile_path: '/person.jpg',
    },
  ],
  crew: [],
});
function create() {
  return mount(Cast, {
    props: { modelValue: true, movieId: 1 },
    global: {
      stubs: {
        BaseModal: { template: '<div><slot /></div>' },
        transition: { template: '<div><slot /></div>' },
      },
    },
  });
}
beforeEach(() => {
  mocks.credits.mockReset();
});
describe('cast dialog async lifecycle', () => {
  it('turns malformed responses into a recoverable inline failure', async () => {
    mocks.credits.mockResolvedValue({ cast: null });
    const wrapper = create();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    wrapper.unmount();
  });
  it('shows reserved portrait skeletons before data and then populated names', async () => {
    let resolve!: (credits: Credits) => void;
    mocks.credits.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const wrapper = create();
    expect(wrapper.find('.mm-cast-dialog').exists()).toBe(true);
    expect(wrapper.findAll('.mm-person-loading')).toHaveLength(10);
    expect(wrapper.find('[role="status"]').text()).toContain('Carregando');
    resolve(result());
    await flushPromises();
    expect(wrapper.find('.mm-people-skeleton').exists()).toBe(false);
    expect(wrapper.text()).toContain('Pessoa');
    wrapper.unmount();
  });
  it('keeps errors inline with retry and supports empty casts', async () => {
    mocks.credits
      .mockRejectedValueOnce(new Error('fixture'))
      .mockResolvedValueOnce({ cast: [], crew: [] });
    const wrapper = create();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    await wrapper.get('.mm-cast-error button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum nome disponível');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('discards responses across close/reopen and movie switches', async () => {
    let first!: (credits: Credits) => void;
    mocks.credits
      .mockReturnValueOnce(
        new Promise((r) => {
          first = r;
        }),
      )
      .mockResolvedValue(result('Novo'));
    const wrapper = create();
    await wrapper.setProps({ modelValue: false });
    await wrapper.setProps({ modelValue: true, movieId: 2 });
    await flushPromises();
    first(result('Antigo'));
    await flushPromises();
    expect(wrapper.text()).toContain('Novo');
    expect(wrapper.text()).not.toContain('Antigo');
    expect(mocks.credits.mock.calls.map((call) => call[0])).toEqual([1, 2]);
    wrapper.unmount();
  });
  it('discards rejection after unmount without leaking an error state', async () => {
    let reject!: (error: Error) => void;
    mocks.credits.mockReturnValue(
      new Promise((_r, r) => {
        reject = r;
      }),
    );
    const wrapper = create();
    wrapper.unmount();
    reject(new Error('late'));
    await flushPromises();
    expect(wrapper.emitted('error')).toBeUndefined();
  });
  it('preserves absolute portrait URLs rather than prefixing the CDN twice', async () => {
    const data = result();
    data.cast[0]!.profile_path = 'https://images.example.test/person.jpg?size=185';
    mocks.credits.mockResolvedValue(data);
    const wrapper = create();
    await flushPromises();
    expect(wrapper.get('img').attributes('src')).toBe(data.cast[0]!.profile_path);
    wrapper.unmount();
  });
});
describe('neutral portrait fallback', () => {
  it('reserves a silhouette and accessible name when no photo exists', () => {
    const wrapper = mount(Portrait, { props: { name: 'Pessoa sem foto' } });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('Pessoa sem foto');
    expect(wrapper.find('svg circle').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('◉');
    wrapper.unmount();
  });
  it('replaces broken network images and retries when the source changes', async () => {
    const wrapper = mount(Portrait, { props: { name: 'Pessoa', src: '/missing.jpg' } });
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('svg').exists()).toBe(true);
    await wrapper.setProps({ src: '/new.jpg' });
    expect(wrapper.get('img').attributes('src')).toBe('/new.jpg');
    expect(wrapper.get('img').attributes('width')).toBe('185');
    wrapper.unmount();
  });
});
