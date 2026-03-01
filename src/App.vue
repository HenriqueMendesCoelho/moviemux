<template>
  <div class="main-app">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { defineComponent } from 'vue';
import { Cookies, Dark } from 'quasar';

import { useStyleStore } from 'src/core/stores/StyleStore';

export default defineComponent({
  name: 'App',
  computed: {
    ...mapState(useStyleStore, ['layoutSettings']),
  },
  mounted() {
    const cookieTheme: string = Cookies.get('theme');
    this.setCookieTheme(cookieTheme);
  },
  methods: {
    setCookieTheme(cookieTheme: string) {
      if (cookieTheme) {
        this.setCookie(cookieTheme);
        return;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.setCookie('dark');
        return;
      }

      this.setCookie('light');
    },
    setCookie(theme: string) {
      Cookies.set('theme', theme, { expires: 30 });
      Dark.set(theme === 'dark');
      this.layoutSettings.darkMode = theme === 'dark';
    },
  },
});
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 100vw;
  height: 100vh;

  max-width: 100%;
  overflow-x: hidden;
  background-color: var(--grey-dark);
}

button {
  cursor: pointer;
  appearance: none;
  border: none;
  outline: none;
  background: none;
}

::selection {
  color: black;
  background-color: var(--primary);
}

.main-app {
  display: flex;

  main {
    flex: 1 1 0;
  }
}

::-webkit-scrollbar {
  width: 0.5rem;
  height: 0.5rem;
}

@media only screen and (max-width: $breakpoint-md-min) {
  ::-webkit-scrollbar {
    width: 0rem;
    height: 0.15rem;
  }
}

::-webkit-scrollbar-track {
  background-color: var(--grey-mid);
}

::-webkit-scrollbar-thumb {
  background-color: var(--light-grey2);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--light-grey);
}
</style>
