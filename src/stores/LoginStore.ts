import { defineStore } from 'pinia';

export const useLoginStore = defineStore('LoginStore', {
  state: () => {
    return {
      user: {
        name: '',
        username: '',
        roles: [],
        expirationToken: Date.now(),
        isLoged: false,
      },
      showDialogLogin: false,
    };
  },
});
