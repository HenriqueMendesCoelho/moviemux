<template>
  <aside v-if="visible" class="mm-floating-actions" aria-label="Navegação da página">
    <slot name="before-top" />
    <button
      type="button"
      class="mm-scroll-top"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      @click="scrollToTop"
    >
      <BaseIcon name="chevron-up" />
    </button>
    <slot name="after-top" />
  </aside>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import BaseIcon from './BaseIcon.vue';
import { useStyleStore } from 'src/core/stores/StyleStore';
const styleStore = useStyleStore();
const visible = ref(false);
function updateVisibility() {
  visible.value = window.scrollY > Math.max(600, window.innerHeight);
}
onMounted(() => {
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener('scroll', updateVisibility));
const scrollToTop = () =>
  styleStore.scrollToContainer(
    0,
    0,
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  );
</script>
<style scoped>
.mm-floating-actions {
  position: fixed;
  bottom: max(16px, env(safe-area-inset-bottom));
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 20;
}
.mm-scroll-top {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--mm-border);
  border-radius: 50%;
  color: var(--mm-muted);
  background: var(--mm-surface);
  box-shadow: 0 3px 12px #0002;
}
.mm-scroll-top:hover {
  color: var(--mm-text);
  background: var(--mm-raised);
}
</style>
