import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileStyle, parse } from 'vue/compiler-sfc';
import { expect, test } from 'vitest';

test('read-only film composition shares a bounded outer column and readable review content', () => {
  const view = parse(
    readFileSync(resolve('src/modules/movie/views/MovieView.vue'), 'utf8'),
  ).descriptor;
  expect(view.template?.content).toContain('BaseContainerMain class="mm-film-detail"');
  const css = view.styles[0]!.content;
  expect(css).toContain('max-width: 70rem');
  expect(css).toContain('@media (min-width: 751px)');
  expect(css).toContain('.mm-movie-readonly');
  const compiled = compileStyle({ source: css, id: 'data-v-film-layout', scoped: true });
  expect(compiled.errors).toEqual([]);
  expect(compiled.code).toContain('.mm-film-detail.mm-container[data-v-film-layout]');
  const reviews = parse(
    readFileSync(resolve('src/modules/movie/components/MovieTableNotes.vue'), 'utf8'),
  ).descriptor;
  expect(reviews.template?.content).toContain('class="mm-reviews-content"');
  expect(reviews.styles[0]!.content).toMatch(
    /\.mm-reviews-content\s*\{[^}]*max-width: 60rem;[^}]*margin-inline: auto;/,
  );
  expect(reviews.styles[0]!.content).not.toMatch(/\.mm-reviews\s*\{[^}]*max-width/);
});
