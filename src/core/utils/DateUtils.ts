import { date } from 'quasar';

export default {
  toLocaleString(date: string | Date): string {
    if (!date) {
      return 'Invalid date';
    }

    const parsedDate = date instanceof Date ? date : new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid date';
    }

    return parsedDate.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  },
  toLocaleDateString(date?: string | Date): string {
    switch (true) {
      case !date:
        return 'Invalid date';
      case date instanceof Date:
        return new Date(date.toISOString().split(/T|\s/)[0] + 'T12:00:00').toLocaleDateString();
      default:
        return new Date(date.toString().split(/T|\s/)[0] + 'T12:00:00').toLocaleDateString();
    }
  },
  toLocaleDateStringLong(date: string | Date | undefined): string {
    if (!date) {
      return 'Invalid date';
    }

    return new Date(date).toLocaleString('pt-Br', {
      dateStyle: 'long',
    });
  },
  extractDate(val: string, pattern = 'DD/MM/YYYY'): Date | undefined {
    if (!val) {
      return;
    }

    return date.extractDate(val, pattern);
  },
};
