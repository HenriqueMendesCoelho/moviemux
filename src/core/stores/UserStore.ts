import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { defineStore } from 'pinia';
import { Cookies } from 'quasar';

import type { tokenPayload } from 'src/core/types/token/TokenType';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;

export const useUserStore = defineStore('UserStore', {
  state: () => {
    return {
      user: {
        id: '',
        name: '',
        username: '',
        roles: [''],
        expirationToken: Date.now() / 1000,
        isLoged: false,
      },
      showDialogLogin: false,
    };
  },
  getters: {
    timeToExpire(): number {
      const until = this.user.expirationToken;
      const dateNow = Math.floor(Date.now() / 1000);

      const diff = until - dateNow;

      const result = diff > 0 ? Math.floor(diff / 60) : 0;

      return result;
    },
    isAdmin(): boolean {
      return Boolean(this.user.roles?.includes('ADM'));
    },
  },
  actions: {
    async login(payload: { email: string; password: string }): Promise<void> {
      const url = `${BASE_URL}/login`;
      const res = await axios.post(url, payload);
      const responsePayload = res.data;
      const token = responsePayload.access_token;

      Cookies.set('auth-kb', token, { expires: new Date(responsePayload.expires), secure: true });
      this.user.isLoged = true;
      this.showDialogLogin = false;
      this.decodeToken(token);
    },
    async refreshToken(): Promise<void> {
      await axios.post(`${BASE_URL}/refresh-token`);
    },
    decodeToken(token: string) {
      if (!token) {
        return;
      }

      const tokenPayload: tokenPayload = jwtDecode(token);

      this.user.id = tokenPayload.id;
      this.user.name = tokenPayload.name;
      this.user.roles = tokenPayload.roles;
      this.user.username = tokenPayload.aud;
      this.user.expirationToken = tokenPayload.exp;
      this.user.isLoged = this.timeToExpire > 2;
    },
  },
});
