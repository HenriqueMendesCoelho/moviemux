import { defineStore } from 'pinia';
import { Cookies } from 'quasar';

export const useStyleStore = defineStore('StyleStore', {
  state: () => {
    return {
      backgroundColor: '#0b0e14',
      layoutSettings: { isSideBarExpanded: false, darkMode: true },
    };
  },
  actions: {
    darkThemeToggle() {
      if (Cookies.get('theme') == 'dark') {
        Cookies.set('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        this.layoutSettings.darkMode = false;
      } else {
        Cookies.set('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        this.layoutSettings.darkMode = true;
      }
    },
    // eslint-disable-next-line
    scrollToContainer: (_top: number, _left: number, _behavior: 'smooth' | 'auto') => null,
  },
});
