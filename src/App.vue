<template>
  <div class="main-app">
    <side-bar v-show="$route.name != 'login'" />
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SideBar from './components/shared/sidebar/SideBar.vue';

export default defineComponent({
  name: 'App',
  components: {
    "side-bar": SideBar
  },
  computed: {
    currentRouteName() {
        return this.$route.name;
    }
  }
});
</script>

<style lang="scss">

:root {
  --primary: #00f6ff;
  --grey-dark: #0b0e14;
  --grey-dark2: #1f2531;
  --grey-mid: #293244;
  --light-grey: #f0ffff94;
  --light-grey2: #f0ffffde;
  --light-blue: #9bf6f9;
  --shadow: #00000056;
  --sidebar-width: 300px;
  --dark-alt: #334155;
  --dark-alt2:rgb(98, 114, 139)5;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Fira sans', sans-serif;
  font-size: 12pt;
}

body {
  width: 100vw;
  height: 100vh;
  background-color: var(--grey-dark);

  max-width: 100%;
}

button {
  cursor: pointer;
  appearance: none;
  border: none;
  outline: none;
  background: none;
}

.main-app {
  display: flex;

  main {
    flex: 1 1 0;
    padding: 1rem;

    @media (max-width: 768px) {
      padding-left: 6rem;
    }
  }
}

::-webkit-scrollbar {
  width: 0.5rem;
}

::-webkit-scrollbar-track{
  background-color: var(--grey-mid);
}

::-webkit-scrollbar-thumb {
  background-color: var(--light-grey2);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--light-grey);
}
</style>>
