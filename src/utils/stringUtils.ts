export default {
  // eslint-disable-next-line
  getStringParams(params: any) {
    return new URLSearchParams(params).toString();
  },
  dateToLocaleString(date: string | Date) {
    return new Date(date).toLocaleString('pt-br', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  },
};
