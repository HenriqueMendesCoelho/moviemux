import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import pt from '../../i18n/locales/pt-BR';
import en from '../../i18n/locales/en';
import { normalizeLocale } from '../../src/core/i18n/locale';
import DateUtils from '../../src/core/utils/DateUtils';
function flatten(value: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof item === 'string'
        ? [[path, item]]
        : Object.entries(flatten(item as Record<string, unknown>, path));
    }),
  );
}
describe('locale resources', () => {
  it('has exact key and interpolation parity across all domains', () => {
    const first = flatten(pt),
      second = flatten(en);
    expect(Object.keys(first).sort()).toEqual(Object.keys(second).sort());
    for (const [key, value] of Object.entries(first)) {
      const params = (s: string) => [...new Set(s.match(/\{\w+\}/g) || [])].sort();
      expect(params(second[key]!), key).toEqual(params(value));
      expect(second[key]?.trim(), key).toBeTruthy();
    }
  });
  it('compiles every message and never exposes a raw key', () => {
    const errors: string[] = [];
    for (const [locale, messages] of Object.entries({ 'pt-BR': pt, en })) {
      const i18n = createI18n({
        legacy: false,
        locale,
        fallbackLocale: 'pt-BR',
        messages: { 'pt-BR': pt, en },
        onWarn: (message: string) => errors.push(message),
      });
      for (const [key, value] of Object.entries(flatten(messages))) {
        const named = Object.fromEntries(
          [...value.matchAll(/\{(\w+)\}/g)].map((m) => [m[1], m[1] === 'count' ? 2 : 'Example']),
        );
        expect(i18n.global.t(key, named), key).not.toBe(key);
      }
    }
    expect(errors).toEqual([]);
  });
  it('allowlists cookies without URI parsing and falls back deterministically', () => {
    for (const value of [undefined, null, '', 'EN', '%ZZ', 'fr', '<script>'])
      expect(normalizeLocale(value)).toBe('pt-BR');
    expect(normalizeLocale('en')).toBe('en');
  });
  it('preserves date-only meaning and uses neutral missing-date output', () => {
    expect(DateUtils.toLocaleDateString('2026-01-02', 'en')).toBe('1/2/2026');
    expect(DateUtils.toLocaleDateString('2026-01-02', 'pt-BR')).toBe('02/01/2026');
    expect(DateUtils.toLocaleString('invalid', 'pt-BR')).toBe('—');
  });
});
