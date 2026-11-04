import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { compileStyle, parse } from 'vue/compiler-sfc';
import Card from 'src/modules/movie-discover/components/MovieDiscoverCardImage.vue';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

vi.mock('src/core/stores/UserStore', () => ({
  useUserStore: () => ({ user: { id: 'owner', isLoged: true } }),
}));
const movie: MovieResultResponseTmdb['results'][number] = {
  id: 42,
  title: 'Tenzing',
  adult: false,
  backdrop_path: '',
  genre_ids: [],
  original_language: 'pt',
  original_title: '',
  overview: '',
  popularity: '',
  poster_path: '/poster.jpg',
  release_date: '2026-01-01',
  video: false,
  vote_average: 8.7,
  vote_count: 1234,
};
const list: WatchlistType = {
  id: 'list-a',
  name: 'My list',
  user: { id: 'owner', name: 'Owner' },
  shareable: false,
  created_at: new Date(),
  updated_at: new Date(),
  movies_wishlists: [],
};
const wrappers: VueWrapper[] = [];
function setup(title = movie.title, release_date = movie.release_date) {
  const wrapper = mount(Card, {
    attachTo: document.body,
    props: { movie: { ...movie, title, release_date }, modelValue: [list] },
    global: {
      components: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
async function menuButton(wrapper: VueWrapper, text: string) {
  await wrapper.get('.mm-context-trigger').trigger('click');
  await flushPromises();
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menu"] button')).find(
    (button) => button.textContent?.trim() === text,
  )!;
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

test.each([
  'Tenzing',
  'Demon Slayer: Kimetsu no Yaiba Castelo Infinito',
  'UmTituloMuitoLongoSemEspacosParaVerificarQueNaoTransborda',
])('keeps complete title access and unchanged film routes for %s', async (title) => {
  const wrapper = setup(title);
  expect(wrapper.get('h3').text()).toBe(title);
  expect(wrapper.get('h3').attributes('title')).toBe(title);
  expect(wrapper.get('.mm-context-trigger').attributes('aria-label')).toBe('Opções para ' + title);
  expect(wrapper.get('.mm-discover-caption > a').attributes('href')).toBe(
    '/movie/discover?movie=42',
  );
  await wrapper.get('.mm-discover-poster').trigger('click');
  expect(wrapper.emitted('clickOnImage')).toHaveLength(1);
  expect(wrapper.get('.mm-discover-caption > span').text()).toBe('2026');
});

test('keeps missing-date fallback and every existing context action payload', async () => {
  const wrapper = setup('A full movie title', '');
  expect(wrapper.get('.mm-discover-caption > span').text()).toBe('Em breve');
  (await menuButton(wrapper, 'Filmes similares')).click();
  await flushPromises();
  expect(wrapper.emitted('callTmdb')?.[0]).toEqual([
    { label: 'Similares a A full movie title', value: 'similar' },
  ]);
  (await menuButton(wrapper, 'Recomendações')).click();
  await flushPromises();
  expect(wrapper.emitted('callTmdb')?.[1]).toEqual([
    { label: 'Recomendações para A full movie title', value: 'recommendation' },
  ]);
  (await menuButton(wrapper, 'Copiar link')).click();
  await flushPromises();
  expect(wrapper.emitted('copy-url')).toEqual([[42]]);
  (await menuButton(wrapper, 'My list')).click();
  await flushPromises();
  expect(wrapper.emitted('add-to-watchlist')).toEqual([[{ id: 'list-a', movieId: 42 }]]);
  expect(wrapper.emitted('clickOnImage')).toBeUndefined();
});

test('keeps membership action disabled during an in-progress addition', async () => {
  const wrapper = setup();
  await wrapper.setProps({ adding: true });
  expect((await menuButton(wrapper, 'My list ✓')).disabled).toBe(true);
  expect(wrapper.attributes('aria-busy')).toBe('true');
});

test('declares equal two-line title space and explicit menu/metadata grid rows without fixed card height', () => {
  const source = readFileSync(
    'src/modules/movie-discover/components/MovieDiscoverCardImage.vue',
    'utf8',
  );
  const css = parse(source).descriptor.styles[0]!.content;
  const compiled = compileStyle({ source: css, id: 'data-v-card', scoped: true });
  expect(compiled.errors).toEqual([]);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const rules = Array.from(sheet.cssRules) as CSSStyleRule[];
  function style(selector: string) {
    return rules.find((rule) => rule.selectorText === selector)!.style;
  }
  expect(style('.mm-discover-caption').display).toBe('grid');
  expect(style('.mm-discover-caption').gridTemplateColumns).toBe('minmax(0, 1fr) 44px');
  const title = style('.mm-discover-caption h3');
  expect(title.minHeight).toBe('2.8em');
  expect(title.lineHeight).toBe('1.4');
  // happy-dom drops this browser-supported vendor declaration from its CSSOM.
  expect(compiled.code).toMatch(
    /\.mm-discover-caption h3\[data-v-card\][^{]*\{[^}]*-webkit-line-clamp: 2/s,
  );
  expect(title.overflow).toBe('hidden');
  expect(title.overflowWrap).toBe('anywhere');
  expect(style('.mm-discover-caption > span').gridColumn).toBe('1 / -1');
  const menu = style('.mm-discover-caption > .mm-card-menu');
  expect(menu.gridColumn).toBe('2');
  expect(menu.gridRow).toBe('1');
  expect(menu.position).toBe('');
  expect(style('.mm-discover-card').height).toBe('');
});
