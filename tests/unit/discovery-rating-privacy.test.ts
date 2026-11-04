import { expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import { createSSRApp } from 'vue';
import { createI18n } from 'vue-i18n';
import pt from '../../i18n/locales/pt-BR';
import { renderToString } from 'vue/server-renderer';
import Card from 'src/modules/movie-discover/components/MovieDiscoverCardImage.vue';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
const movie: MovieResultResponseTmdb['results'][number] = {
  id: 42,
  title: 'Uma descoberta',
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
const Link = { props: ['to'], template: '<a :href="to"><slot /></a>' };
test('discovery poster never reveals external score in text, attributes or SSR', async () => {
  const wrapper = mount(Card, {
    props: { movie, modelValue: [] },
    global: { components: { RouterLink: Link } },
  });
  expect(wrapper.html()).not.toContain('8.7');
  expect(wrapper.find('.mm-score').exists()).toBe(false);
  await wrapper.setProps({ movie: { ...movie, id: 43, vote_average: 9.4 } });
  expect(wrapper.html()).not.toContain('9.4');
  wrapper.unmount();
  const app = createSSRApp(Card, { movie, modelValue: [] });
  app.use(createI18n({ legacy: false, locale: 'pt-BR', messages: { 'pt-BR': pt, en: pt } }));
  app.component('RouterLink', Link);
  const html = await renderToString(app);
  expect(html).not.toContain('8.7');
  expect(html).not.toContain('1234');
});
