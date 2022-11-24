<template>
  <div class="main-app">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'App',
});
</script>

<style lang="scss">
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

  max-width: 100%;
  overflow-x: hidden;
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
  background-color: var(--grey-dark);

  main {
    flex: 1 1 0;
    @media (max-width: 768px) {
      padding-left: 0.8rem;
    }
  }
}

::-webkit-scrollbar {
  width: 0.5rem;
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
>
