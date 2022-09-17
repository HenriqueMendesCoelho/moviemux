export default {
  setCookie(name: string, value: any, exp_days: number) {
    const d = new Date();
    d.setTime(d.getTime() + exp_days * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    document.cookie = name + '=' + value + ';' + expires + ';path=/';
  },
  getCookie(name: string) {
    const cname = name + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(cname) == 0) {
        return c.substring(cname.length, c.length);
      }
    }
    return '';
  },
  deleteCookie(name: string) {
    const d = new Date();
    d.setTime(d.getTime() - 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    document.cookie = name + '=;' + expires + ';path=/';
  },
};
