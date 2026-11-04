export const localeCookieName = 'moviemux-language';
export type AppLocale = 'pt-BR' | 'en';
export function normalizeLocale(value: unknown): AppLocale {
  return value === 'en' ? 'en' : 'pt-BR';
}
