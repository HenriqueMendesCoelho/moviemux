<template>
  <main v-if="name === 'login'">
    <Suspense>
      <router-view></router-view>
    </Suspense>
  </main>
  <main v-else>
    <router-view></router-view>
  </main>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const name = computed(() => route.name);
</script>

<style lang="scss" scoped>
main {
  height: 100vh;
}
</style>
