export default {
  getStringParams(params: any) {
    return new URLSearchParams(params).toString();
  },
  runtimeToText(runtime?: number, locale = 'pt-BR') {
    if (!runtime) {
      return '0';
    }
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;

    return minutes > 0
      ? `${hours.toLocaleString(locale)}h ${minutes.toLocaleString(locale)}m`
      : `${hours.toLocaleString(locale)}h`;
  },
};
