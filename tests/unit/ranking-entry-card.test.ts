import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { expect, test, vi } from 'vitest';
import en from '../../i18n/locales/en';
import pt from '../../i18n/locales/pt-BR';
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { tmdbImageBase: 'https://fixture.test/t/p' } }),
}));
import Card from '../../src/modules/ranking/components/RankingEntryCard.vue';
import type { RankingEntry } from '../../src/modules/ranking/services/RankingCatalogService';
const entry: RankingEntry = {
  entry_id: '11111111-1111-4111-8111-111111111111',
  movie_id: '22222222-2222-4222-8222-222222222222',
  tmdb_id: 12,
  original_title: 'Original',
  english_title: 'Selected film',
  portuguese_title: 'Filme escolhido',
  url_image: '/poster.jpg',
  release_date: '2020-01-20',
  runtime: 103,
  created_at: '2026-11-22T00:00:00Z',
};
function view(item = entry, locale = 'en', selected = false) {
  return mount(Card, {
    props: { entry: item, selected },
    global: { plugins: [createI18n({ legacy: false, locale, messages: { en, 'pt-BR': pt } })] },
  });
}
test('one native scoped selection button, accessible title and metadata, no links or scores', async () => {
  const w = view(
    {
      ...entry,
      english_title: 'Long'.repeat(60),
      score: 10,
      notes: ['never-expose-private-score'],
    } as RankingEntry,
    'en',
    true,
  );
  const button = w.get('button');
  expect(button.attributes('type')).toBe('button');
  expect(button.attributes('aria-pressed')).toBe('true');
  expect(w.get('strong').attributes('id')).toBe(button.attributes('aria-labelledby'));
  expect(w.get('.mm-entry-meta').attributes('id')).toBe(button.attributes('aria-describedby'));
  expect(w.text()).toContain('2020');
  expect(w.text()).toContain('103 min');
  expect(w.html()).not.toContain('never-expose-private-score');
  expect(w.find('a').exists()).toBe(false);
  await button.trigger('click');
  expect(w.emitted('select')).toEqual([[]]);
  w.unmount();
});
test('PT-BR/original/fallback title and missing or invalid metadata are accurate', async () => {
  const w = view(entry, 'pt-BR');
  expect(w.text()).toContain('Filme escolhido');
  await w.setProps({
    entry: { ...entry, portuguese_title: null, release_date: '2020-02-30', runtime: 0 },
  });
  expect(w.text()).toContain('Original');
  expect(w.find('.mm-entry-meta').exists()).toBe(false);
  await w.setProps({
    entry: { ...entry, portuguese_title: null, english_title: null, original_title: null },
  });
  expect(w.text()).toContain('Filme sem título');
  w.unmount();
});
test('validated posters use responsive TMDB helper, fixed slot, fall back on error and reset on new source', async () => {
  const w = view();
  const image = w.get('img');
  expect(image.attributes('src')).toBe('https://fixture.test/t/p/w185/poster.jpg');
  expect(image.attributes('srcset')).toContain('/w92/poster.jpg 92w');
  expect(image.attributes('alt')).toBe('');
  expect(image.attributes('referrerpolicy')).toBe('no-referrer');
  expect(w.find('.mm-entry-poster-loading').exists()).toBe(true);
  await image.trigger('load');
  expect(w.find('.mm-entry-poster-loading').exists()).toBe(false);
  await image.trigger('error');
  expect(w.find('img').exists()).toBe(false);
  expect(w.find('.mm-entry-poster-fallback').exists()).toBe(true);
  await w.setProps({
    entry: { ...entry, url_image: 'http://image.tmdb.org/t/p/w600_and_h900_bestv2/another.jpg' },
  });
  expect(w.get('img').attributes('src')).toBe('https://image.tmdb.org/t/p/w185/another.jpg');
  expect(w.find('.mm-entry-poster-loading').exists()).toBe(true);
  w.unmount();
});
test.each([
  null,
  'https://evil.test/t/p/w342/poster.jpg',
  '//evil.test/poster.jpg',
  'https://image.tmdb.org.evil.test/t/p/w342/poster.jpg',
  'https://fixture.test/t/p/../secret.jpg',
  '/poster.jpg?x=1',
  'data:image/png;base64,abc',
])('untrusted or missing poster %s never gets an img request', (value) => {
  const w = view({ ...entry, url_image: value });
  expect(w.find('img').exists()).toBe(false);
  expect(w.find('.mm-entry-poster-fallback').exists()).toBe(true);
  w.unmount();
});
