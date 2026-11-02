<template>
  <aside class="mm-floating-actions">
    <slot name="before-top" /><button
      type="button"
      class="mm-button mm-button-primary"
      aria-label="Ir para o topo"
      @click="scrollToTop"
    >
      ↑</button
    ><slot name="after-top" />
  </aside>
</template>
<script setup lang="ts">
import { useStyleStore } from 'src/core/stores/StyleStore';
const styleStore = useStyleStore();
const scrollToTop = () => styleStore.scrollToContainer(0, 0, 'smooth');
</script>
<style scoped>
.mm-floating-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  gap: 8px;
  z-index: 20;
}
</style>
