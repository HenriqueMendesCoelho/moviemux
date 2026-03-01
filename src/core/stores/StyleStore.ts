import { defineStore } from 'pinia';
import { Cookies, Dark } from 'quasar';

export const useStyleStore = defineStore('StyleStore', {
  state: () => {
    return {
      backgroundColor: '#0b0e14',
      layoutSettings: { isSideBarExpanded: false, darkMode: true },
    };
  },
  actions: {
    darkThemeToggle() {
      const isDark = !Dark.isActive;
      Dark.set(isDark);
      Cookies.set('theme', isDark ? 'dark' : 'light', { expires: 30 });
      this.layoutSettings.darkMode = isDark;
    },
    // eslint-disable-next-line
    scrollToContainer: (_top: number, _left: number, _behavior: 'smooth' | 'auto') => null,
  },
});
