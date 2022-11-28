import { defineStore } from 'pinia';

export const useLoginStore = defineStore('LoginStore', {
  state: () => {
    return {
      isLoged: false,
    };
  },
});
