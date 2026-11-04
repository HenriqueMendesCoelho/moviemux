import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('src/css/app.scss', 'utf8');
const sheet = new CSSStyleSheet();
sheet.replaceSync(app.replace(/^@import.*$/gm, '').replace(/\s+/g, ' '));

function findRule(rules: CSSRuleList, selector: string): CSSStyleRule {
  const result = Array.from(rules).find(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector,
  );
  if (!result) throw new Error(`Missing CSS selector: ${selector}`);
  return result;
}

function authoredRule(source: string, selector: string): Record<string, string> {
  // Inspect the authored shorthand: happy-dom cannot resolve var() in outline.
  const compact = source.replace(/\s+/g, ' ');
  const marker = `${selector} {`;
  const start = compact.indexOf(marker);
  if (start < 0) throw new Error(`Missing authored selector: ${selector}`);
  const block = compact.slice(start + marker.length).split('}')[0]!;
  return Object.fromEntries(
    block
      .split(';')
      .filter((value) => value.trim())
      .map((value) => {
        const colon = value.indexOf(':');
        return [value.slice(0, colon).trim(), value.slice(colon + 1).trim()];
      }),
  );
}

function componentRule(file: string, selector: string): Record<string, string> {
  const source = readFileSync(file, 'utf8');
  const css = source.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1];
  if (!css) throw new Error(`Missing component CSS: ${file}`);
  return authoredRule(css, selector);
}

function luminance(hex: string): number {
  const expanded = hex.length === 4 ? hex.replace(/[\da-f]/gi, '$&$&') : hex;
  const channels = expanded
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe('compact accessible focus appearance', () => {
  // Source policy and token contrast only. Native browser QA checks painted focus,
  // modality heuristics, clipping and visibility over real poster images.
  it('uses a compact solid outline while retaining native focus-visible matching', () => {
    const controls = ['button', 'a', 'input', 'textarea', 'select', 'summary'];
    const selector = controls.map((control) => `${control}:focus-visible`).join(', ');
    expect(findRule(sheet.cssRules, selector)).toBeDefined();
    expect(authoredRule(app, selector)).toEqual({
      outline: '2px solid var(--mm-focus-ring)',
      'outline-offset': '2px',
    });
    expect(app).not.toMatch(/:focus:not\(:focus-visible\)|forced-color-adjust:\s*none/);
  });

  it.each([':root', ":root[data-theme='light']"])(
    'keeps focus readable against every app surface in %s',
    (selector) => {
      const theme = findRule(sheet.cssRules, selector);
      const ring = theme.style.getPropertyValue('--mm-focus-ring');
      for (const surface of ['--mm-bg', '--mm-surface', '--mm-raised']) {
        expect(contrast(ring, theme.style.getPropertyValue(surface))).toBeGreaterThanOrEqual(3);
      }
      expect(ring).not.toBe(theme.style.getPropertyValue('--mm-link'));
    },
  );

  it('uses system Highlight with enough specificity for both themes in forced colors', () => {
    const forcedColors = Array.from(sheet.cssRules).find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText === '(forced-colors: active)',
    );
    expect(forcedColors).toBeDefined();
    const rule = findRule(forcedColors!.cssRules, ":root, :root[data-theme='light']");
    expect(rule.style.getPropertyValue('--mm-focus-ring')).toBe('Highlight');
    expect(Array.from(sheet.cssRules).indexOf(forcedColors!)).toBeGreaterThan(
      Array.from(sheet.cssRules).indexOf(findRule(sheet.cssRules, ":root[data-theme='light']")),
    );
  });

  it('keeps menu focus visible and preserves its deliberate inset placement', () => {
    const file = 'src/core/components/BaseContextMenu.vue';
    const trigger = componentRule(file, '.mm-context-trigger:focus-visible');
    expect(trigger.outline).toBe('2px solid var(--mm-focus-ring)');
    expect(trigger['outline-offset']).toBe('2px');
    const item = componentRule(file, ".mm-context-items :deep([role='menuitem']:focus-visible)");
    expect(item.outline).toBe('2px solid var(--mm-focus-ring)');
    expect(item['outline-offset']).toBe('-2px');
  });

  it('uses the shared focus palette and compact gap on watchlist posters', () => {
    const poster = componentRule(
      'src/modules/movie-watchlist/components/MovieWatchlistImageCard.vue',
      '.mm-poster-link:focus-visible',
    );
    expect(poster.outline).toBe('2px solid var(--mm-focus-ring)');
    expect(poster['outline-offset']).toBe('2px');
  });

  it('retains the composite search focus indicator without altering drag selection', () => {
    const file = 'src/modules/movie-watchlist/views/MovieWatchlistView.vue';
    const search = componentRule(file, '.mm-search-field:focus-within');
    expect(search.outline).toBe('2px solid var(--mm-focus-ring)');
    expect(search['outline-offset']).toBe('2px');
    const dragging = componentRule(file, '[data-swapy-highlighted]');
    expect(dragging.outline).toBe('2px solid var(--primary)');
    expect(dragging['outline-offset']).toBe('4px');
  });

  it('does not repurpose primary branding or validation colors as focus tokens', () => {
    const dark = findRule(sheet.cssRules, ':root');
    const light = findRule(sheet.cssRules, ":root[data-theme='light']");
    expect(dark.style.getPropertyValue('--primary')).toBe('#00f6ff');
    expect(dark.style.getPropertyValue('--mm-danger-text')).toBe('#ff8da3');
    expect(light.style.getPropertyValue('--mm-danger-text')).toBe('#b42347');
  });
});
