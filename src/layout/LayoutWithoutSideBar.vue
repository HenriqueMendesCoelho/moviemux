<template>
  <main>
    <router-view></router-view>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LayoutWithoutSideBar',
});
</script>

<style lang="scss" scoped>
main {
  height: 100vh;
}
</style>
