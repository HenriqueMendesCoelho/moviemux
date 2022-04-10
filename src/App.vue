<template>
  <div class="main">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
//import LoginInit from "./components/login/LoginInit.vue"

export default defineComponent({
  name: 'App',
  components: {
    //"login-start": LoginInit
  }
});
</script>

<style scoped>
.main {
  width: 100vw;
  height: 100vh;
  background-color: #0b0e14;
}
</style>>
