<template>
  <section class="mm-loading-state">
    <p class="mm-sr-only" role="status">{{ label }}</p>
    <div class="mm-loading-shapes" aria-busy="true" aria-hidden="true"><slot /></div>
  </section>
</template>
<script setup lang="ts">
defineProps<{ label: string }>();
</script>
<style scoped>
.mm-loading-state,
.mm-loading-shapes {
  min-width: 0;
}
</style>
