import { defineStore } from 'pinia';

export const useStyleStore = defineStore('StyleStore', {
  state: () => {
    return {
      backgroundColor: '#0b0e14',
      layoutSettings: { isSideBarExpanded: false, darkMode: true },
    };
  },
  actions: {
    darkThemeToggle() {
      if (localStorage.getItem('theme') == 'dark') {
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        this.layoutSettings.darkMode = false;
      } else {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        this.layoutSettings.darkMode = true;
      }
    },
  },
});
