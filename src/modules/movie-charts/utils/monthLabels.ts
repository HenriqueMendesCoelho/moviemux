const monthNames = [
  ['janeiro', 'jan', 'january'],
  ['fevereiro', 'fev', 'february', 'feb'],
  ['março', 'marco', 'mar', 'march'],
  ['abril', 'abr', 'april', 'apr'],
  ['maio', 'mai', 'may'],
  ['junho', 'jun', 'june'],
  ['julho', 'jul', 'july'],
  ['agosto', 'ago', 'august', 'aug'],
  ['setembro', 'set', 'september', 'sep', 'sept'],
  ['outubro', 'out', 'october', 'oct'],
  ['novembro', 'nov', 'november'],
  ['dezembro', 'dez', 'december', 'dec'],
];
/** Preserve unknown upstream labels; normalize recognized month labels for display only. */
export function compactMonthLabel(value: string, locale = 'pt-BR'): string {
  const numeric = value.match(/^(\d{4})[-/](\d{2})(?:\D|$)/);
  const text = value
    .replace(/[/ \u2013\u2014-]*\d{4}/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\.$/, '');
  const month = numeric
    ? Number(numeric[2]) - 1
    : monthNames.findIndex((names) => names.includes(text));
  if (month < 0 || month > 11) return value;
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, month, 1)))
    .replace('.', '');
}

const genreIds: Record<string, number> = {
  ação: 28,
  action: 28,
  aventura: 12,
  adventure: 12,
  animação: 16,
  animation: 16,
  comédia: 35,
  comedy: 35,
  crime: 80,
  documentário: 99,
  documentary: 99,
  drama: 18,
  família: 10751,
  family: 10751,
  fantasia: 14,
  fantasy: 14,
  história: 36,
  history: 36,
  terror: 27,
  horror: 27,
  música: 10402,
  music: 10402,
  mistério: 9648,
  mystery: 9648,
  romance: 10749,
  'ficção científica': 878,
  'science fiction': 878,
  'cinema tv': 10770,
  'filme para tv': 10770,
  'tv movie': 10770,
  thriller: 53,
  suspense: 53,
  guerra: 10752,
  war: 10752,
  faroeste: 37,
  western: 37,
};
export function standardGenreId(name: string): number | undefined {
  return genreIds[name.trim().toLocaleLowerCase('pt-BR')];
}
