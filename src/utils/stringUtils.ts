export default {
  getStringParams(params: any) {
    return new URLSearchParams(params).toString();
  },
};
