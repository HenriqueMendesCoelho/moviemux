import { defineStore } from 'pinia';
export const useStyleStore = defineStore('StyleStore', {
  state: () => ({
    backgroundColor: '#0b0e14',
    layoutSettings: { isSideBarExpanded: false, darkMode: true },
  }),
  actions: {
    initializeTheme() {
      const cookie = document.cookie
        .split('; ')
        .find((v) => v.startsWith('theme='))
        ?.split('=')[1];
      this.setTheme(
        cookie ? cookie === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches,
      );
    },
    setTheme(dark: boolean) {
      this.layoutSettings.darkMode = dark;
      if (import.meta.client) {
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        document.cookie = `theme=${dark ? 'dark' : 'light'}; path=/; max-age=2592000; SameSite=Lax`;
      }
    },
    darkThemeToggle() {
      this.setTheme(!this.layoutSettings.darkMode);
    },
    scrollToContainer(top: number, left: number, behavior: 'smooth' | 'auto') {
      if (import.meta.client) window.scrollTo({ top, left, behavior });
    },
  },
});
