<template>
  <div class="main-app">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { defineComponent } from 'vue';
import { Cookies } from 'quasar';

import { useStyleStore } from './stores/StyleStore';

export default defineComponent({
  name: 'App',
  computed: {
    ...mapState(useStyleStore, ['layoutSettings']),
  },
  mounted() {
    const cookieTheme = Cookies.get('theme') as 'dark' | 'light';
    this.setCookieTheme(cookieTheme);
  },
  methods: {
    setCookieTheme(cookieTheme: 'dark' | 'light') {
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
    setCookie(theme: 'dark' | 'light') {
      Cookies.set('theme', theme, { expires: 30 });
      document.documentElement.setAttribute('data-theme', theme);
    },
  },
});
</script>

<style lang="scss">
@import 'src/components/shared/scss/style.scss';

:root {
  --primary: #00f6ff;
  --grey-dark: #0b0e14;
  --grey-dark2: #1f2531;
  --grey-mid: #293244;
  --grey-mid2: #343c4c;
  --light-grey: #f0ffff94;
  --light-grey2: #f0ffffde;
  --light-blue: #9bf6f9;
  --shadow: #00000056;
  --sidebar-width: 300px;
  --dark-alt: #334155;
  --dark-alt2: rgb(98, 114, 139) 5;
}

[data-theme='light'] {
  --primary: #00f6ff;
  --grey-dark: #828383;
  --grey-dark2: #b8b7b7;
  --grey-mid: #a6a7a7;
  --grey-mid2: #acaeae;
  --light-grey: #f0ffff94;
  --light-grey2: #f0ffffde;
  --light-blue: #9bf6f9;
  --shadow: #cacaca95;
  --sidebar-width: 300px;
  --dark-alt: #9f9f9f;
  --dark-alt2: rgb(98, 114, 139) 5;
}

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
    height: 0.25rem;
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
