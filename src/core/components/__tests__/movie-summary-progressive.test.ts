import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
const services = vi.hoisted(() => ({ summary: vi.fn(), genres: vi.fn(), providers: vi.fn() }));
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://image.tmdb.org/t/p' } }),
}));
vi.mock('src/core/stores/UserStore', () => ({
  useUserStore: () => ({ user: { id: 'fixture', generation: 'one' } }),
}));
vi.mock('src/core/services/KitService', () => ({
  default: { summary: services.summary, getWatchProviders: services.providers },
}));
vi.mock('src/modules/movie/services/MovieService', () => ({
  default: { getMoviesGenres: services.genres },
}));
import Summary from '../BaseFormMovieSummary.vue';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const record = (id: number) => ({
  tmdb_id: id,
  portuguese_title: `Filme ${id}`,
  original_title: `Film ${id}`,
  description: 'Sinopse disponível',
  genres: ['Drama'],
  runtime: 120,
});
const availability = (name: string) => ({
  results: {
    BR: {
      link: 'https://www.themoviedb.org/movie/1/watch',
      flatrate: [{ provider_id: 1, provider_name: name, logo_path: '/provider.png' }],
    },
  },
});
const mountSummary = () =>
  mount(Summary, {
    props: { movieId: 1, externalRating: { movieId: 1, value: 0, votes: 1234 } },
    global: { stubs: { BaseBtnDialogCast: true, BaseIcon: true } },
  });
beforeEach(() => {
  vi.resetAllMocks();
  services.summary.mockResolvedValue(record(1));
  services.genres.mockReturnValue(new Promise(() => {}));
});
describe('progressive film details', () => {
  it('shows a 100ms summary while a controlled 5-second provider request is still pending', async () => {
    vi.useFakeTimers();
    services.summary.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(record(1)), 100)),
    );
    services.providers.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(availability('Delayed provider')), 5000)),
    );
    const wrapper = mountSummary();
    try {
      await vi.advanceTimersByTimeAsync(100);
      expect(wrapper.text()).toContain('Filme 1');
      expect(wrapper.get('.mm-providers').text()).toContain('Buscando plataformas');
      expect(services.genres).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(4999);
      expect(wrapper.text()).not.toContain('Delayed provider');
      await vi.advanceTimersByTimeAsync(1);
      expect(wrapper.text()).toContain('Delayed provider');
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });

  it('shows summary and genre names immediately without waiting for a genre lookup or providers', async () => {
    const providers = deferred<ReturnType<typeof availability>>();
    services.providers.mockReturnValue(providers.promise);
    const wrapper = mountSummary();
    await flushPromises();
    expect(wrapper.text()).toContain('Filme 1');
    expect(wrapper.text()).toContain('Sinopse disponível');
    expect(wrapper.text()).toContain('Drama');
    expect(services.genres).not.toHaveBeenCalled();
    expect(services.summary).toHaveBeenCalledTimes(1);
    expect(services.providers).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.mm-summary-skeleton').exists()).toBe(false);
    expect(wrapper.get('.mm-providers').text()).toContain('Buscando plataformas');
    expect(wrapper.get('.mm-preview-rating').text()).not.toContain('0.0');
    expect(wrapper.html()).not.toContain('1234');
    providers.resolve(availability('Fixture streaming'));
    await flushPromises();
    expect(wrapper.text()).toContain('Fixture streaming');
    wrapper.unmount();
  });
  it('keeps core content when provider loading fails and retries providers only', async () => {
    services.providers
      .mockRejectedValueOnce(new Error('slow provider unavailable'))
      .mockResolvedValueOnce(availability('Recovered provider'));
    const wrapper = mountSummary();
    await flushPromises();
    expect(wrapper.text()).toContain('Filme 1');
    expect(wrapper.find('.mm-summary-error').exists()).toBe(false);
    await wrapper.get('.mm-providers button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Recovered provider');
    expect(services.summary).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
  it('does not show old provider results after switching films', async () => {
    const first = deferred<ReturnType<typeof availability>>();
    services.providers
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(availability('Provider two'));
    services.summary.mockResolvedValueOnce(record(1)).mockResolvedValueOnce(record(2));
    const wrapper = mountSummary();
    await flushPromises();
    await wrapper.setProps({ movieId: 2 });
    await flushPromises();
    first.resolve(availability('Old provider'));
    await flushPromises();
    expect(wrapper.text()).toContain('Filme 2');
    expect(wrapper.text()).toContain('Provider two');
    expect(wrapper.text()).not.toContain('Old provider');
    wrapper.unmount();
  });
  it('ignores a late provider rejection after closing', async () => {
    const providers = deferred<ReturnType<typeof availability>>();
    services.providers.mockReturnValue(providers.promise);
    const wrapper = mountSummary();
    await flushPromises();
    expect(wrapper.text()).toContain('Filme 1');
    wrapper.unmount();
    providers.reject(new Error('late'));
    await flushPromises();
    expect(wrapper.emitted('error')).toBeUndefined();
  });
});
