import { defineStore } from 'pinia';

export const useProfileStore = defineStore('ProfileStore', {
  state: () => {
    return {
      ProfileSelectBar: {
        PanelMyData: true,
        PanelSecurity: false,
      },
    };
  },
});
