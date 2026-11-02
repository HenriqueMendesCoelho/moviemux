import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
const service = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://image.tmdb.org/t/p' } }),
}));
vi.mock('src/core/services/KitService', () => ({ default: { getWatchProviders: service.load } }));
import Providers from '../BaseMovieWatchProviders.vue';
const provider = (id: number, name: string) => ({
  provider_id: id,
  provider_name: name,
  logo_path: `/logo-${id}.png`,
  display_priority: id,
});
const mountProviders = () =>
  mount(Providers, { props: { tmdbId: 1 }, global: { stubs: { BaseIcon: true } } });
beforeEach(() => vi.resetAllMocks());
describe('provider offer categories', () => {
  it('keeps the provider name and shows a neutral tile when its logo fails', async () => {
    service.load.mockResolvedValue({ results: { BR: { rent: [provider(1, 'Named Store')] } } });
    const wrapper = mountProviders();
    await flushPromises();
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.mm-provider-no-logo').exists()).toBe(true);
    expect(wrapper.text()).toContain('Named Store');
    wrapper.unmount();
  });

  it('keeps each offer type in its own labeled section, including repeated providers', async () => {
    service.load.mockResolvedValue({
      results: {
        BR: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=BR',
          flatrate: [provider(1, 'Streaming One')],
          rent: [provider(2, 'Same Store')],
          buy: [provider(2, 'Same Store')],
          free: [provider(3, 'Free One')],
          ads: [provider(4, 'Ad One')],
        },
        US: { flatrate: [provider(5, 'US only')] },
      },
    });
    const wrapper = mountProviders();
    await flushPromises();
    const groups = wrapper.findAll('.mm-provider-category');
    expect(groups.map((g) => g.get('h4').text())).toEqual([
      'Streaming por assinatura',
      'Alugar',
      'Comprar',
      'Grátis',
      'Grátis com anúncios',
    ]);
    expect(groups[0]!.text()).toContain('Streaming One');
    expect(groups[1]!.text()).toContain('Same Store');
    expect(groups[2]!.text()).toContain('Same Store');
    expect(groups[3]!.text()).toContain('Free One');
    expect(groups[4]!.text()).toContain('Ad One');
    expect(wrapper.text()).not.toContain('US only');
    expect(wrapper.text()).toContain('Brasil');
    expect(wrapper.findAll('figcaption').filter((p) => p.text() === 'Same Store')).toHaveLength(2);
    expect(wrapper.get('.mm-provider-footer > a').attributes('href')).toBe(
      'https://www.themoviedb.org/movie/1/watch?locale=BR',
    );
    expect(wrapper.text()).toContain('JustWatch');
    expect(wrapper.text()).not.toContain('R$');
    expect(wrapper.text()).not.toContain('4K');
    expect(wrapper.findAll('.mm-provider-list a')).toHaveLength(0);
    wrapper.unmount();
  });
  it('shows a country-specific empty state rather than substituting another country', async () => {
    service.load.mockResolvedValue({ results: { US: { flatrate: [provider(5, 'US only')] } } });
    const wrapper = mountProviders();
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma plataforma informada para este filme no Brasil.');
    expect(wrapper.text()).not.toContain('US only');
    expect(wrapper.find('.mm-provider-category').exists()).toBe(false);
    wrapper.unmount();
  });
  it('does not render empty offer groups and names providers that lack artwork', async () => {
    service.load.mockResolvedValue({
      results: {
        BR: { flatrate: [], buy: [], rent: [{ ...provider(1, 'Named Store'), logo_path: '' }] },
      },
    });
    const wrapper = mountProviders();
    await flushPromises();
    expect(wrapper.findAll('.mm-provider-category')).toHaveLength(1);
    expect(wrapper.get('h4').text()).toBe('Alugar');
    expect(wrapper.text()).toContain('Named Store');
    expect(wrapper.find('img').exists()).toBe(false);
    wrapper.unmount();
  });
  it('separates loading, failure/retry, and an empty successful response', async () => {
    let reject!: (error: Error) => void;
    service.load
      .mockReturnValueOnce(new Promise((_r, j) => (reject = j)))
      .mockResolvedValueOnce({ results: { BR: {} } });
    const wrapper = mountProviders();
    await flushPromises();
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.get('.mm-provider-skeleton').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[role="status"]').text()).toContain('Buscando');
    reject(new Error('private upstream details'));
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível');
    expect(wrapper.text()).not.toContain('private upstream details');
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Nenhuma plataforma');
    wrapper.unmount();
  });
});
