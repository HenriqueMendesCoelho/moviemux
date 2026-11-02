import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const css = readFileSync('src/core/ui/filter-toolbar.css', 'utf8');

test('both browse routes establish a named available-width query scope', () => {
  expect(css).toMatch(/\.mm-browse-scope\s*\{\s*container:\s*movie-browse\s*\/\s*inline-size/);
  for (const file of [
    'src/modules/movie-home/components/MovieHomeGridMovies.vue',
    'src/modules/movie-discover/views/MovieDiscoverView.vue',
  ]) {
    expect(readFileSync(file, 'utf8')).toContain('mm-browse-scope');
  }
});

test('layout transitions use container-relative font units, not window breakpoints', () => {
  expect(css).not.toContain('@media');
  const thresholds = [...css.matchAll(/@container movie-browse \(min-width: ([\d.]+)em\)/g)].map(
    (match) => Number(match[1]),
  );
  expect(thresholds).toEqual([22, 44, 46, 64]);
  // Boundary inventory for native rendered QA. This does not simulate browser layout.
  for (const fontSize of [16, 20, 24, 32]) {
    for (const threshold of thresholds) {
      const boundary = threshold * fontSize;
      for (const offset of [-8, -1, 0, 1, 8]) {
        expect((boundary + offset) / fontSize >= threshold).toBe(offset >= 0);
      }
    }
  }
});

test('wide tracks distribute free space and reserve intrinsic action widths', () => {
  expect(css).toContain('minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) max-content');
  expect(css).toContain('minmax(0, 1.1fr)');
  expect(css).toContain('max-content max-content');
  expect(css).not.toMatch(/minmax\([^,]+,\s*\d+(?:\.\d+)?rem\)/);
  expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
  expect(css).toContain('justify-self: end');
  expect(css).toContain('max-width: 100%');
  expect(css).toMatch(/\.mm-browse-toolbar > button\s*\{\s*min-height: 44px/);
});

test('wide discovery resets intermediate spans with matching selector specificity', () => {
  const wide = css.slice(css.indexOf('@container movie-browse (min-width: 64em)'));
  expect(wide).toContain(':is(.mm-autocomplete, .mm-sort, .mm-discover-year, .mm-multiselect)');
  expect(wide).toContain('grid-column: auto');
  expect(wide).not.toContain('.mm-browse-toolbar-discover > *');
});
