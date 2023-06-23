import { defineStore } from 'pinia';

export const useStyleStore = defineStore('StyleStore', {
  state: () => {
    return {
      backgroundColor: '#0b0e14',
      sideBarWidth: '7rem',
      isExpanded: false,
      layoutSettings: { darkMode: true },
    };
  },
  getters: {
    getMarginSideBar(state) {
      const is_expanded = localStorage.getItem('is_expanded') == 'true' ? true : false;

      state.isExpanded = is_expanded;

      if (is_expanded) {
        state.sideBarWidth = '320px';
      }

      return state.sideBarWidth;
    },
    getIsExpanded(): boolean {
      const is_expanded = localStorage.getItem('is_expanded') === 'true' ? true : false;
      if (is_expanded) {
        localStorage.setItem('is_expanded', 'true');
      }
      return is_expanded || this.isExpanded;
    },
  },
  actions: {
    ToggleMenuStore() {
      this.isExpanded ? this.collapseMenu() : this.expandMenu();
    },
    collapseMenu() {
      this.isExpanded = false;
      this.sideBarWidth = '7rem';
    },
    expandMenu() {
      this.isExpanded = true;
      this.sideBarWidth = '320px';
    },
    setIsExpanded(newValue: boolean) {
      this.isExpanded = newValue;
    },
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
