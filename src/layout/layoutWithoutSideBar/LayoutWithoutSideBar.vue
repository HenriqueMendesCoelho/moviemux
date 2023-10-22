<template>
  <main>
    <Suspense>
      <router-view></router-view>
      <template #fallback>
        <div class="text-h2">Loading...</div>
      </template>
    </Suspense>
  </main>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
main {
  height: 100vh;
}
</style>
