export default {
  // eslint-disable-next-line
  getStringParams(params: any) {
    return new URLSearchParams(params).toString();
  },
};
