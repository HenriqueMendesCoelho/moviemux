import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { reactive } from 'vue';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
const mocks = vi.hoisted(() => ({
  user: { user: { id: 'owner', isLoged: true } },
  store: {
    watchlists: [] as WatchlistType[],
    pendingMembership: {} as Record<string, boolean>,
    addMovie: vi.fn(),
  },
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie-watchlist/stores/MovieWatchlistStore', () => ({
  useMovieWatchlistStore: () => mocks.store,
}));
vi.mock('src/core/utils/NotificationUtils', () => ({
  showSuccess: mocks.success,
  showError: mocks.error,
}));
import Card from 'src/modules/movie-watchlist/components/MovieWatchlistImageCard.vue';
const wrappers: VueWrapper[] = [];
const movie = {
  tmdb_id: 12,
  title: 'Um título bastante longo para duas linhas',
  title_english: 'Original',
  url_image: '/poster.jpg',
  release_date: new Date('2025-05-01'),
};
function list(id: string, member = false): WatchlistType {
  return {
    id,
    name: `Lista ${id}`,
    user: { id: 'owner', name: 'Owner' },
    shareable: false,
    created_at: new Date(),
    updated_at: new Date(),
    movies_wishlists: member ? [movie] : [],
  };
}
function setup(extra = {}) {
  const wrapper = mount(Card, {
    attachTo: document.body,
    props: {
      movie,
      wishlists: [list('a'), list('b', true)],
      showRemoveItem: true,
      animate: true,
      ...extra,
    },
    global: {
      stubs: {
        BaseCardImage: {
          name: 'BaseCardImage',
          props: ['animate', 'alt'],
          template: '<div class="poster-stub"><slot /></div>',
        },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
async function open(wrapper: VueWrapper) {
  await wrapper.get('.mm-context-trigger').trigger('click');
  await flushPromises();
  return document.querySelector<HTMLElement>('[role="menu"]')!;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = reactive({ user: { id: 'owner', isLoged: true } });
  mocks.store.watchlists = [];
  mocks.store.pendingMembership = {};
  mocks.store.addMovie.mockResolvedValue(true);
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  document.body.innerHTML = '';
});
describe('watchlist cards use consistent icon actions', () => {
  it('keeps action trigger beside caption, with accessible name and no raw actions text', async () => {
    const wrapper = setup();
    expect(wrapper.text()).not.toContain('Ações do filme');
    expect(wrapper.get('.mm-film-caption .mm-film-menu').exists()).toBe(true);
    expect(wrapper.get('.mm-context-trigger').attributes('aria-label')).toBe(
      `Opções de ${movie.title}`,
    );
    expect(wrapper.get('.mm-context-trigger').attributes('title')).toBe(`Opções de ${movie.title}`);
    expect(wrapper.get('h3').attributes('title')).toBe(movie.title);
    const panel = await open(wrapper);
    expect(wrapper.emitted('open')).toBeUndefined();
    const copy = Array.from(panel.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Copiar link'),
    )!;
    copy.click();
    await flushPromises();
    expect(wrapper.emitted('copy-url')).toHaveLength(1);
    expect(wrapper.emitted('open')).toBeUndefined();
  });
  it('retains list membership and confirmation event without opening a movie', async () => {
    const wrapper = setup();
    let panel = await open(wrapper);
    const target = Array.from(panel.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Lista a'),
    )!;
    target.click();
    await flushPromises();
    expect(mocks.store.addMovie).toHaveBeenCalledWith('a', 12);
    panel = await open(wrapper);
    const existing = Array.from(panel.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Lista b'),
    )!;
    expect(existing.disabled).toBe(true);
    const remove = Array.from(panel.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Remover desta lista'),
    )!;
    remove.click();
    await flushPromises();
    expect(wrapper.emitted('removeMovie')).toHaveLength(1);
    expect(wrapper.emitted('open')).toBeUndefined();
  });
  it('hides actions and prevents open/hover during Swapy reordering', async () => {
    const wrapper = setup({ reordering: true });
    expect(wrapper.find('.mm-context-trigger').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'BaseCardImage' }).props('animate')).toBe(false);
    await wrapper.get('.mm-poster-link').trigger('click');
    await wrapper.get('.mm-film-title').trigger('click');
    expect(wrapper.emitted('open')).toBeUndefined();
  });
  it('uses the shared home poster animation when normal and keeps copy disabled while unavailable', async () => {
    const wrapper = setup();
    expect(wrapper.findComponent({ name: 'BaseCardImage' }).props('animate')).toBe(true);
    await wrapper.setProps({ disabled: true });
    expect(wrapper.findComponent({ name: 'BaseCardImage' }).props('animate')).toBe(false);
    const panel = await open(wrapper);
    expect(Array.from(panel.querySelectorAll('button')).every((button) => button.disabled)).toBe(
      true,
    );
  });
});

it('shared poster CSS preserves home lift with fine-pointer, keyboard and reduced-motion guards', async () => {
  const { readFileSync } = await import('node:fs');
  const { parse, compileStyle } = await import('vue/compiler-sfc');
  const source = readFileSync(
    `${process.cwd()}/src/core/components/BaseCardImage.vue`,
    'utf8',
  );
  const css = parse(source).descriptor.styles[0]!.content;
  expect(css).toContain('@media (hover: hover) and (pointer: fine)');
  expect(css).toContain('transition: transform 0.2s ease');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toContain('transform: none !important');
  const compiled = compileStyle({ source: css, id: 'data-v-poster-test', scoped: true });
  expect(compiled.errors).toEqual([]);
  expect(compiled.code).toContain(
    ':where(a, button):focus-visible > .mm-poster-animate[data-v-poster-test]',
  );
});
