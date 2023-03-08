import { tokenPayload } from '@/types/token/token';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { defineStore } from 'pinia';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;

export const useUserStore = defineStore('UserStore', {
  state: () => {
    return {
      user: {
        name: '',
        username: '',
        roles: [''],
        expirationToken: Date.now(),
        isLoged: false,
      },
      showDialogLogin: false,
    };
  },
  getters: {
    lifeTimeSession(): number {
      if (this.user.isLoged) {
        const until = new Date(this.user.expirationToken).getTime();
        const dateNow = Date.now();

        const diff = until - dateNow;

        return diff > 0 ? Math.floor(diff / 1000 / 60) : 0;
      }
      return 0;
    },
    sessionIsCloseToExpire(): boolean | null {
      if (!this.user.isLoged) {
        return null;
      }

      const timeToExpire = this.lifeTimeSession;

      return timeToExpire <= 10;
    },
  },
  actions: {
    async login(payload: { email: string; password: string }): Promise<void> {
      const url = `${BASE_URL}/login`;
      console.log(url);
      try {
        const res = await axios.post(`${BASE_URL}/login`, payload);
        const responsePayload = res.data;
        const token = responsePayload.access_token;

        localStorage.setItem('auth-kb', token);
        this.user.isLoged = true;
        this.showDialogLogin = false;
        this.user.expirationToken = new Date(responsePayload.expires).getTime();
        this.decodeToken(token);

        return Promise.resolve();
      } catch {
        return Promise.reject();
      }
    },
    async refreshToken(): Promise<void> {
      try {
        axios.post(`${BASE_URL}/refresh-token`);
        return Promise.resolve();
      } catch {
        return Promise.reject();
      }
    },
    decodeToken(token: string) {
      if (!token) {
        return;
      }

      const tokenPayload = jwtDecode(token) as tokenPayload;

      this.user.name = tokenPayload.name;
      this.user.roles = tokenPayload.roles;
      this.user.username = tokenPayload.aud;
    },
  },
});
