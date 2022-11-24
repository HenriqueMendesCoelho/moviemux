<template>
  <main>
    <router-view />
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
  height: calc(100vh - 1rem);
  padding: 1rem;
}
</style>
