import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/css/scrollbars.css', 'utf8');
const app = readFileSync('src/css/app.scss', 'utf8');
const sheet = new CSSStyleSheet();
// Normalize whitespace for happy-dom's limited multiline selector parser.
sheet.replaceSync(css.replace(/\s+/g, ' '));
const appSheet = new CSSStyleSheet();
appSheet.replaceSync(app.replace(/^@import.*$/gm, '').replace(/\s+/g, ' '));

function styleRule(rules: CSSRuleList, selector: string): CSSStyleRule {
  const rule = Array.from(rules).find(
    (candidate): candidate is CSSStyleRule =>
      candidate instanceof CSSStyleRule && candidate.selectorText === selector,
  );
  if (!rule) throw new Error(`Missing CSS rule: ${selector}`);
  return rule;
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

describe('native scrollbar theme policy', () => {
  // A CSS parser checks our authored policy, not painted native scrollbar behavior.
  // OS/browser rendering and actual wheel, thumb and keyboard interaction need browser QA.
  const media = sheet.cssRules[0] as CSSMediaRule;
  const support = media.cssRules[0] as CSSSupportsRule;
  const root = styleRule(support.cssRules, ':root');
  const light = styleRule(support.cssRules, ":root[data-theme='light']");

  it('compiles the stylesheet as valid CSS', () => {
    expect(compileString(css).css).toContain('scrollbar-color:');
  });

  it('gates every enhancement on pointer, hover, high-contrast and browser support', () => {
    expect(sheet.cssRules).toHaveLength(1);
    expect(media).toBeInstanceOf(CSSMediaRule);
    expect(media.conditionText).toBe(
      '(hover: hover) and (pointer: fine) and (forced-colors: none)',
    );
    expect(media.cssRules).toHaveLength(1);
    expect(support).toBeInstanceOf(CSSSupportsRule);
    expect(support.conditionText).toBe('(scrollbar-color: auto)');
  });

  it('keeps width, visibility, overflow, focus and scroll input native', () => {
    expect(root.style.getPropertyValue('scrollbar-width')).toBe('auto');
    for (const rule of Array.from(support.cssRules)) {
      expect(rule).toBeInstanceOf(CSSStyleRule);
      const style = (rule as CSSStyleRule).style;
      for (let index = 0; index < style.length; index++) {
        expect(style.item(index)).toMatch(/^--mm-scrollbar-|^scrollbar-(?:color|width)$/);
      }
    }
    expect(css).not.toMatch(/::-webkit-scrollbar|!important|scrollbar-width:\s*(thin|none)/);
  });

  it.each([
    { name: 'dark', selector: ':root', scrollbar: root },
    { name: 'light', selector: ":root[data-theme='light']", scrollbar: light },
  ])('keeps resting and interaction colors readable in $name mode', ({ selector, scrollbar }) => {
    const theme = styleRule(appSheet.cssRules, selector);
    const background = theme.style.getPropertyValue('--mm-bg');
    const thumb = scrollbar.style.getPropertyValue('--mm-scrollbar-thumb');
    const accent = theme.style.getPropertyValue('--mm-link');
    expect(root.style.getPropertyValue('--mm-scrollbar-track')).toBe('var(--mm-bg)');
    expect(contrast(thumb, background)).toBeGreaterThanOrEqual(3);
    expect(contrast(accent, background)).toBeGreaterThanOrEqual(3);
  });

  it('inherits the resting theme and accents focused or hovered scrollers without a global hover', () => {
    expect(root.style.getPropertyValue('scrollbar-color')).toBe(
      'var(--mm-scrollbar-thumb) var(--mm-scrollbar-track)',
    );
    const interactive = support.cssRules[2] as CSSStyleRule;
    expect(interactive.selectorText).toContain(':is(:hover, :focus-within)');
    expect(interactive.selectorText).toContain(':focus-visible');
    for (const selector of ["[role='listbox']", "[role='menu']", '.mm-table-scroll', 'textarea']) {
      expect(interactive.selectorText).toContain(selector);
    }
    expect(interactive.selectorText).not.toMatch(/:root|\*|html|body/);
    expect(interactive.style.getPropertyValue('scrollbar-color')).toBe(
      'var(--mm-link) var(--mm-scrollbar-track)',
    );
    expect(styleRule(appSheet.cssRules, ':root').style.getPropertyValue('--primary')).toBe(
      '#00f6ff',
    );
  });

  it('loads once after the font import and removes conflicting local select styles', () => {
    expect(app.match(/@import ['"]\.\/scrollbars\.css['"]/g)).toHaveLength(1);
    expect(app.indexOf("@import './scrollbars.css'")).toBeGreaterThan(app.indexOf('@import url('));
    expect(app.indexOf("@import './scrollbars.css'")).toBeLessThan(app.indexOf(':root {'));
    for (const name of ['BaseSelect', 'BaseMultiSelect']) {
      expect(readFileSync(`src/core/components/${name}.vue`, 'utf8')).not.toMatch(
        /scrollbar-(?:width|color)\s*:/,
      );
    }
  });
});
