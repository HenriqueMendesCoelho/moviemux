import { createI18n } from 'vue-i18n';
import pt from '../../../../i18n/locales/pt-BR';
import en from '../../../../i18n/locales/en';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { flushPromises, shallowMount } from '@vue/test-utils';
const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  genres: vi.fn(),
  user: { id: 'user', generation: 'one' },
}));
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://image.tmdb.org/t/p' } }),
}));
vi.mock('src/core/services/KitService', () => ({ default: { summary: mocks.summary } }));
vi.mock('src/modules/movie/services/MovieService', () => ({
  default: { getMoviesGenres: mocks.genres },
}));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => ({ user: mocks.user }) }));
import Summary from '../BaseFormMovieSummary.vue';
function mountSummary(externalRating?: { movieId: number; value: number; votes?: number }) {
  return shallowMount(Summary, {
    props: { movieId: 1, externalRating },
    global: { stubs: { transition: { template: '<div><slot /></div>' } } },
  });
}
const record = (id: number) => ({
  tmdb_id: id,
  portuguese_title: `Filme ${id}`,
  original_title: `Film ${id}`,
  description: 'Uma história.',
  genres: [],
  vote_average: 8.7,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.summary.mockReset();
  mocks.user = reactive({ id: 'user', generation: 'one' });
});
describe('movie summary async presentation', () => {
  it('reserves a skeleton immediately and deduplicates repeated pending loads', async () => {
    let resolve!: (value: ReturnType<typeof record>) => void;
    mocks.summary.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const wrapper = mountSummary();
    expect(wrapper.find('.mm-summary-skeleton').exists()).toBe(true);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    void wrapper.vm.getMovie();
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    resolve(record(1));
    await flushPromises();
    expect(wrapper.find('.mm-summary-skeleton').exists()).toBe(false);
    expect(wrapper.text()).toContain('Filme 1');
    expect(wrapper.text()).not.toContain('8,7');
    wrapper.unmount();
  });
  it('shows inline error and retry without dismissing the reserved surface', async () => {
    mocks.summary.mockRejectedValueOnce(new Error('fixture')).mockResolvedValueOnce(record(1));
    const wrapper = mountSummary();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    await wrapper.get('.mm-summary-error button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Filme 1');
    expect(wrapper.find('.mm-summary-error').exists()).toBe(false);
    wrapper.unmount();
  });
  it('never paints a previous movie response after switching targets', async () => {
    let first!: (value: ReturnType<typeof record>) => void;
    mocks.summary
      .mockReturnValueOnce(
        new Promise((r) => {
          first = r;
        }),
      )
      .mockResolvedValueOnce(record(2));
    const wrapper = mountSummary();
    await wrapper.setProps({ movieId: 2 });
    await flushPromises();
    first(record(1));
    await flushPromises();
    expect(wrapper.text()).toContain('Filme 2');
    expect(wrapper.text()).not.toContain('Filme 1');
    wrapper.unmount();
  });
  it('discards a rejected request after closing instead of emitting a stale error', async () => {
    let reject!: (error: Error) => void;
    mocks.summary.mockReturnValue(
      new Promise((_resolve, r) => {
        reject = r;
      }),
    );
    const wrapper = mountSummary();
    wrapper.unmount();
    reject(new Error('late'));
    await flushPromises();
    expect(wrapper.emitted('error')).toBeUndefined();
  });
});

describe('external rating consent', () => {
  it('does not serialize score or count into server-rendered markup', async () => {
    const html = await renderToString(
      createSSRApp(Summary, {
        movieId: 1,
        externalRating: { movieId: 1, value: 8.7, votes: 1234 },
      }).use(createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': pt, en: pt } })),
    );
    expect(html).not.toContain('8,7');
    expect(html).not.toContain('1234');
    expect(html).toContain('mm-summary-skeleton');
  });
  it('keeps numeric ratings out of DOM and accessible labels until explicit per-film reveal', async () => {
    mocks.summary.mockResolvedValue(record(1));
    const wrapper = mountSummary({ movieId: 1, value: 8.7, votes: 1234 });
    await flushPromises();
    expect(wrapper.html()).not.toContain('8,7');
    expect(wrapper.html()).not.toContain('1234');
    const reveal = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Revelar nota'))!;
    await reveal.trigger('click');
    expect(wrapper.text()).toContain('8,7');
    expect(wrapper.text()).toContain('1234');
    mocks.user.generation = 'two';
    await flushPromises();
    expect(wrapper.html()).not.toContain('8,7');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Revelar nota'))!
      .trigger('click');
    mocks.summary.mockResolvedValue(record(2));
    await wrapper.setProps({ movieId: 2, externalRating: { movieId: 2, value: 6.2 } });
    await flushPromises();
    expect(wrapper.html()).not.toContain('6,2');
    expect(wrapper.html()).not.toContain('8,7');
    wrapper.unmount();
  });
  it('does not offer a mismatched or unavailable score and resets when preview is reopened', async () => {
    mocks.summary.mockResolvedValue(record(1));
    const mismatch = mountSummary({ movieId: 2, value: 9.1 });
    await flushPromises();
    expect(mismatch.text()).not.toContain('Revelar nota');
    mismatch.unmount();
    const first = mountSummary({ movieId: 1, value: 8.7 });
    await flushPromises();
    await first
      .findAll('button')
      .find((button) => button.text().includes('Revelar nota'))!
      .trigger('click');
    first.unmount();
    const reopened = mountSummary({ movieId: 1, value: 8.7 });
    await flushPromises();
    expect(reopened.html()).not.toContain('8,7');
    reopened.unmount();
  });
});

describe('summary genre localization', () => {
  it('switches known genre labels without changing unknown labels or movie content', async () => {
    const i18n = createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': pt, en } });
    mocks.summary.mockResolvedValue({
      ...record(1),
      genres: ['Ação', 'Comédia', 'Experimental pessoal'],
    });
    const wrapper = shallowMount(Summary, { props: { movieId: 1 }, global: { plugins: [i18n] } });
    await flushPromises();
    expect(wrapper.get('.mm-genre-list').text()).toContain('Ação');
    expect(wrapper.get('.mm-genre-list').text()).toContain('Comédia');
    i18n.global.locale.value = 'en';
    await flushPromises();
    expect(wrapper.get('.mm-genre-list').text()).toContain('Action');
    expect(wrapper.get('.mm-genre-list').text()).toContain('Comedy');
    expect(wrapper.get('.mm-genre-list').text()).toContain('Experimental pessoal');
    expect(wrapper.text()).toContain('Filme 1');
    expect(wrapper.text()).toContain('Uma história.');
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
