import axios from 'src/core/http';
import { jwtDecode } from 'jwt-decode';
import { defineStore } from 'pinia';
import { useCookie } from '#app';

import type { tokenPayload } from 'src/core/types/token/TokenType';

const BASE_URL = '';

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

      useCookie('auth-kb', {
        expires: new Date(responsePayload.expires),
        secure: import.meta.client && location.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
      }).value = token;
      this.user.isLoged = true;
      this.showDialogLogin = false;
      this.decodeToken(token);
    },
    async refreshToken(): Promise<void> {
      await axios.post(`${BASE_URL}/refresh-token`);
    },
    logout() {
      useCookie('auth-kb', { path: '/' }).value = null;
      this.$reset();
    },
    decodeToken(token: string) {
      if (!token) {
        this.user.isLoged = false;
        return;
      }

      let tokenPayload: tokenPayload;
      try {
        tokenPayload = jwtDecode<tokenPayload>(token);
      } catch {
        this.$reset();
        return;
      }
      if (!Array.isArray(tokenPayload.roles) || typeof tokenPayload.exp !== 'number') {
        this.$reset();
        return;
      }

      this.user.id = tokenPayload.id;
      this.user.name = tokenPayload.name;
      this.user.roles = tokenPayload.roles;
      this.user.username = tokenPayload.aud;
      this.user.expirationToken = tokenPayload.exp;
      this.user.isLoged = this.timeToExpire > 2;
    },
  },
});
