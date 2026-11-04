export default {
  toLocaleString(date: string | Date, locale = 'pt-BR'): string {
    if (!date) {
      return '—';
    }

    const parsedDate = date instanceof Date ? date : new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleString(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  },
  toLocaleDateString(date?: string | Date, locale = 'pt-BR'): string {
    if (!date) return '—';
    if (date instanceof Date && Number.isNaN(date.getTime())) return '—';
    const datePart = (date instanceof Date ? date.toISOString() : date).split(/T|\s/)[0];
    const parsedDate = new Date(`${datePart}T12:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? '—' : parsedDate.toLocaleDateString(locale);
  },
  toLocaleDateStringLong(date: string | Date | undefined, locale = 'pt-BR'): string {
    if (!date) {
      return '—';
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '—';

    return parsedDate.toLocaleString(locale, {
      dateStyle: 'long',
    });
  },
  extractDate(val: string, pattern = 'DD/MM/YYYY'): Date | undefined {
    if (!val) {
      return;
    }

    if (pattern === 'YYYY-MM-DD') return new Date(`${val}T12:00:00`);
    const [day, month, year] = val.split('/').map(Number);
    if (!day || !month || !year) return undefined;
    return new Date(year, month - 1, day, 12);
  },
};
