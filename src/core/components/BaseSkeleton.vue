<template>
  <span
    aria-hidden="true"
    class="mm-skeleton"
    :class="`mm-skeleton-${shape}`"
    :style="{ width, height }"
  />
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{ shape?: 'line' | 'block' | 'circle'; width?: string; height?: string }>(),
  {
    shape: 'line',
  },
);
</script>
<style scoped>
.mm-skeleton {
  display: block;
  width: 100%;
  height: 0.9rem;
  min-width: 0;
  border-radius: 0.4rem;
  background: color-mix(in srgb, var(--mm-text) 16%, var(--mm-raised));
  animation: mm-skeleton-breathe 1.6s ease-in-out infinite alternate;
  pointer-events: none;
}
.mm-skeleton-block {
  height: 100%;
  border-radius: 0.85rem;
}
.mm-skeleton-circle {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
}
@keyframes mm-skeleton-breathe {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mm-skeleton {
    animation: none;
  }
}
</style>
