import axios from 'src/core/http';
import { defineStore } from 'pinia';
import { publicSession } from 'src/core/session';

export const useUserStore = defineStore('UserStore', {
  state: () => ({
    user: {
      id: '',
      name: '',
      username: '',
      roles: [] as string[],
      expirationToken: 0,
      generation: '',
      isLoged: false,
    },
    csrfToken: '',
    sessionLoaded: false,
    showDialogLogin: false,
  }),
  getters: {
    timeToExpire(): number {
      return Math.max(0, Math.floor((this.user.expirationToken - Date.now() / 1000) / 60));
    },
    isAdmin(): boolean {
      return this.user.roles.includes('ADM');
    },
  },
  actions: {
    applySession(value: unknown) {
      const session = publicSession(value);
      if (!session.user) {
        this.$reset();
        this.sessionLoaded = true;
        return;
      }
      this.user = {
        id: session.user.id,
        name: session.user.name,
        username: session.user.username,
        roles: session.user.roles,
        expirationToken: session.user.expiresAt / 1000,
        generation: session.user.generation,
        isLoged: true,
      };
      this.csrfToken = session.csrfToken || '';
      this.sessionLoaded = true;
      this.showDialogLogin = false;
    },
    async fetchSession(): Promise<void> {
      const response = await axios.get('/_auth/session');
      this.applySession(response.data);
    },
    async login(payload: {
      email: string;
      password: string;
      'cf-turnstile-response'?: string;
    }): Promise<void> {
      const response = await axios.post('/login', payload);
      this.applySession(response.data);
      if (!this.user.isLoged) throw new Error('Invalid login session');
    },
    async logout(): Promise<void> {
      await axios.post('/logout');
      this.$reset();
      this.sessionLoaded = true;
    },
  },
});
