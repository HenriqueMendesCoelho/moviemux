<template>
  <login-start/>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import LoginInit from "./components/login/LoginInit.vue"

export default defineComponent({
  name: 'App',
  components: {
    "login-start": LoginInit
  }
});
</script>

<style>

</style>
