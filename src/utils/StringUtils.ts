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
  runtimeToText(runtime?: number) {
    if (!runtime) {
      return '0';
    }
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  },
};
