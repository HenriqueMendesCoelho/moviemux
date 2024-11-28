import { date } from 'quasar';

export default {
  toLocaleString(date: string | Date) {
    if (!date) {
      return '';
    }

    return new Date(date).toLocaleString('pt-br', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  },
  toLocaleDateString(date?: string | Date) {
    switch (true) {
      case !date:
        return 'Invalid date';
      case date instanceof Date:
        return new Date(date.toISOString().split(/T|\s/)[0] + 'T12:00:00').toLocaleDateString();
      default:
        return new Date(date.toString().split(/T|\s/)[0] + 'T12:00:00').toLocaleDateString();
    }
  },
  toLocaleDateStringLong(date: string | Date | undefined) {
    if (!date) {
      return;
    }

    return new Date(date).toLocaleString('pt-Br', {
      dateStyle: 'long',
    });
  },
  extractDate(val: string, pattern = 'DD/MM/YYYY') {
    if (!val) {
      return;
    }

    return date.extractDate(val, pattern);
  },
};
