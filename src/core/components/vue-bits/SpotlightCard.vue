<!--
  Adapted from Vue Bits SpotlightCard by David Haz (2025).
  Upstream commit: 3766ebeeed37ec35bce29f001b6d101c7b17da35
  https://github.com/DavidHDev/vue-bits/blob/3766ebeeed37ec35bce29f001b6d101c7b17da35/src/content/Components/SpotlightCard/SpotlightCard.vue
  MIT + Commons Clause; see the adjacent LICENSE.md and README.md.
-->
<template>
  <div
    ref="divRef"
    :class="['vb-spotlight-card', className]"
    @mousemove="handleMouseMove"
    @focusin="handleFocus"
    @focusout="handleBlur"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="vb-spotlight-overlay"
      aria-hidden="true"
      :style="{
        opacity,
        background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
      }"
    />
    <slot />
  </div>
</template>
<script setup lang="ts">
import { ref, useTemplateRef, onMounted, onBeforeUnmount } from 'vue';
interface Position {
  x: number;
  y: number;
}
interface SpotlightCardProps {
  className?: string;
  spotlightColor?: string;
}
const { className = '', spotlightColor = 'rgba(0, 246, 255, 0.08)' } =
  defineProps<SpotlightCardProps>();
const divRef = useTemplateRef<HTMLDivElement>('divRef');
const isFocused = ref(false);
const position = ref<Position>({ x: 0, y: 0 });
const opacity = ref(0);
let preferences: MediaQueryList | undefined;
let enabled = false;
let hovered = false;
function updateEligibility() {
  enabled = Boolean(preferences?.matches) && document.visibilityState !== 'hidden';
  if (!enabled) {
    hovered = false;
    opacity.value = 0;
  }
}
const handleMouseMove = (event: MouseEvent) => {
  if (!enabled || !hovered || !divRef.value || isFocused.value) return;
  const rect = divRef.value.getBoundingClientRect();
  position.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
};
const handleFocus = () => {
  isFocused.value = true;
  // Preserve the native focus ring. No new tab stop or keyboard-only visual effect.
  opacity.value = 0;
};
const handleBlur = (event: FocusEvent) => {
  if (event.relatedTarget instanceof Node && divRef.value?.contains(event.relatedTarget)) return;
  isFocused.value = false;
  opacity.value = 0;
};
const handleMouseEnter = () => {
  if (!enabled || isFocused.value) return;
  hovered = true;
  opacity.value = 0.6;
};
const handleMouseLeave = () => {
  hovered = false;
  opacity.value = 0;
};
onMounted(() => {
  preferences = window.matchMedia(
    '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
  );
  updateEligibility();
  preferences.addEventListener('change', updateEligibility);
  document.addEventListener('visibilitychange', updateEligibility);
});
onBeforeUnmount(() => {
  preferences?.removeEventListener('change', updateEligibility);
  document.removeEventListener('visibilitychange', updateEligibility);
});
</script>
<style scoped>
.vb-spotlight-card {
  position: relative;
  border-radius: var(--mm-radius, 18px);
}
.vb-spotlight-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 180ms ease-out;
}
@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
  .vb-spotlight-overlay {
    display: none;
    transition: none;
  }
}
</style>
