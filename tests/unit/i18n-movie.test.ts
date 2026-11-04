import { afterEach, expect, test } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { defineComponent, h, nextTick, ref } from 'vue';
import MovieSaveBtnGroup from '../../src/modules/movie/components/MovieSaveBtnGroup.vue';
import MovieTooltipInfo from '../../src/modules/movie/components/MovieTooltipInfo.vue';
import MovieYoutubeTrailerIframe from '../../src/modules/movie/components/MovieYoutubeTrailerIframe.vue';
import { provideMovieContext } from '../../src/modules/movie/composables/useMovieContext';
import { fullReleaseDate, sortNotes } from '../../src/modules/movie/utils/MovieStateUtils';
import Movie from '../../src/core/domain/movie/movie';
import ptCatalog from '../../i18n/locales/pt-BR/catalog.json';
const pt = ptCatalog.movie;
import enCatalog from '../../i18n/locales/en/catalog.json';
const en = enCatalog.movie;

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
const createLocale = () =>
  createI18n({
    legacy: false,
    locale: 'pt-BR',
    fallbackLocale: 'pt-BR',
    messages: { 'pt-BR': { catalog: { movie: pt } }, en: { catalog: { movie: en } } },
  });

test('movie catalogs have matching keys and resolve title interpolation', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
  const i18n = createLocale();
  i18n.global.locale.value = 'en';
  expect(i18n.global.t('catalog.movie.importConfirm', { title: 'Central do Brasil' })).toBe(
    'Import “Central do Brasil”? The current fields will be replaced.',
  );
  expect(i18n.global.t('catalog.movie.pagination', { start: '1', end: '5', total: '10' })).toBe(
    '1–5 of 10',
  );
});

test('movie actions switch languages in place without changing their events', async () => {
  const i18n = createLocale();
  const wrapper = mount(MovieSaveBtnGroup, { global: { plugins: [i18n] } });
  wrappers.push(wrapper);
  expect(wrapper.text()).toContain('Salvar filme');
  i18n.global.locale.value = 'en';
  await nextTick();
  expect(wrapper.text()).toContain('Save movie');
  expect(wrapper.text()).toContain('Cancel');
  await wrapper.findAll('button')[0]!.trigger('click');
  expect(wrapper.emitted('save')).toHaveLength(1);
  i18n.global.locale.value = 'pt-BR';
  await nextTick();
  expect(wrapper.text()).toContain('Salvar filme');
});

test('metadata labels and dates change while authored names remain unchanged', async () => {
  const i18n = createLocale();
  const movie = new Movie();
  movie.user_name = 'José da Silva';
  movie.created_at = new Date('2026-01-03T12:00:00Z');
  const Host = defineComponent({
    setup() {
      provideMovieContext(ref(movie));
      return () => h(MovieTooltipInfo);
    },
  });
  const wrapper = mount(Host, { global: { plugins: [i18n] } });
  wrappers.push(wrapper);
  expect(wrapper.text()).toContain('Cadastrado por José da Silva');
  i18n.global.locale.value = 'en';
  await nextTick();
  expect(wrapper.text()).toContain('Added by José da Silva');
  expect(wrapper.text()).toContain('About this entry');
});

test('release dates keep calendar meaning with explicit locales and fallback text', () => {
  expect(fullReleaseDate('2026-01-03T00:00:00Z', 'pt-BR')).toBe('03/01/2026');
  expect(fullReleaseDate('2026-01-03T00:00:00Z', 'en')).toBe('01/03/2026');
  expect(fullReleaseDate(undefined, 'en', 'Date unavailable')).toBe('Date unavailable');
  for (const invalid of [
    '2026-99-99',
    '2026-00-00',
    '2026-02-30',
    'not-a-date',
    new Date('invalid'),
  ]) {
    expect(fullReleaseDate(invalid, 'pt-BR', 'Data não informada')).toBe('Data não informada');
    expect(fullReleaseDate(invalid, 'en', 'Date unavailable')).toBe('Date unavailable');
  }
  expect(fullReleaseDate('2024-02-29', 'pt-BR')).toBe('29/02/2024');
  expect(fullReleaseDate('2024-02-29', 'en')).toBe('02/29/2024');
  expect(sortNotes([], 'name', 'en')).toEqual([]);
});

test('trailer iframe preserves the privacy-enhanced source', () => {
  const wrapper = mount(MovieYoutubeTrailerIframe, {
    props: { url: 'https://www.youtube.com/watch?v=abcDEF_1234' },
    global: { plugins: [createLocale()] },
  });
  wrappers.push(wrapper);
  expect(wrapper.get('iframe').attributes('src')).toBe(
    'https://www.youtube-nocookie.com/embed/abcDEF_1234',
  );
  expect(wrapper.get('iframe').attributes('title')).toBe('YouTube video player');
});
