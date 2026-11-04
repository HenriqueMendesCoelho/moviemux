<template>
  <div
    ref="background"
    class="mm-login-ambient"
    :class="{ 'mm-login-ambient-active': active }"
    aria-hidden="true"
  >
    <div class="mm-login-ambient-drift" />
    <div class="mm-login-ambient-pointer" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
const background = ref<HTMLDivElement>();
const eligible = ref(false);
const focused = ref(false);
const active = computed(() => eligible.value && !focused.value);
let preferences: MediaQueryList | undefined;
let frame: number | undefined;
let pointer: { target: HTMLElement; x: number; y: number } | undefined;
let windowFocused = true;
let disposed = false;
const interactive = 'input, textarea, select, button, iframe, [contenteditable="true"]';
function cancelFrame() {
  if (frame !== undefined) window.cancelAnimationFrame(frame);
  frame = undefined;
}
function resetPointer() {
  cancelFrame();
  pointer = undefined;
  background.value?.style.setProperty('--ambient-x', '0px');
  background.value?.style.setProperty('--ambient-y', '0px');
}
function updateEligibility() {
  eligible.value =
    Boolean(preferences?.matches) && document.visibilityState !== 'hidden' && windowFocused;
  if (!eligible.value) resetPointer();
}
function onPointerMove(event: PointerEvent) {
  if (
    !active.value ||
    disposed ||
    (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen')
  )
    return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  pointer = { target, x: event.clientX, y: event.clientY };
  if (frame !== undefined) return;
  frame = window.requestAnimationFrame(() => {
    frame = undefined;
    if (!active.value || disposed || !pointer) return;
    const bounds = pointer.target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    const x = clamp(((pointer.x - bounds.left) / bounds.width - 0.5) * 2) * 18;
    const y = clamp(((pointer.y - bounds.top) / bounds.height - 0.5) * 2) * 18;
    background.value?.style.setProperty('--ambient-x', `${x}px`);
    background.value?.style.setProperty('--ambient-y', `${y}px`);
  });
}
function onPointerLeave() {
  resetPointer();
}
function onFocusIn(event: FocusEvent) {
  if (!(event.target instanceof Element) || !event.target.closest(interactive)) return;
  focused.value = true;
  resetPointer();
}
function onFocusOut(event: FocusEvent) {
  focused.value =
    event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest(interactive));
}
function onWindowBlur() {
  windowFocused = false;
  updateEligibility();
}
function onWindowFocus() {
  windowFocused = true;
  focused.value =
    document.activeElement instanceof Element &&
    Boolean(document.activeElement.closest(interactive));
  updateEligibility();
}
onMounted(() => {
  preferences = window.matchMedia(
    '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
  );
  focused.value =
    document.activeElement instanceof Element &&
    Boolean(document.activeElement.closest(interactive));
  updateEligibility();
  preferences.addEventListener('change', updateEligibility);
  document.addEventListener('visibilitychange', updateEligibility);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);
});
onBeforeUnmount(() => {
  disposed = true;
  cancelFrame();
  preferences?.removeEventListener('change', updateEligibility);
  document.removeEventListener('visibilitychange', updateEligibility);
  window.removeEventListener('blur', onWindowBlur);
  window.removeEventListener('focus', onWindowFocus);
});
defineExpose({ onPointerMove, onPointerLeave, onFocusIn, onFocusOut });
</script>

<style scoped>
.mm-login-ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.mm-login-ambient-drift,
.mm-login-ambient-pointer {
  position: absolute;
  inset: -24px;
}
.mm-login-ambient-drift {
  background:
    radial-gradient(
      ellipse at 12% 18%,
      color-mix(in srgb, var(--mm-accent, #00f6ff) 6%, transparent),
      transparent 46%
    ),
    radial-gradient(
      ellipse at 88% 78%,
      color-mix(in srgb, var(--mm-accent, #00f6ff) 4%, transparent),
      transparent 42%
    );
  animation: mm-login-drift 28s ease-in-out infinite alternate;
  animation-play-state: paused;
}
.mm-login-ambient-pointer {
  background: radial-gradient(
    ellipse at 38% 38%,
    color-mix(in srgb, var(--mm-accent, #00f6ff) 7%, transparent),
    transparent 48%
  );
  transform: translate3d(var(--ambient-x, 0px), var(--ambient-y, 0px), 0);
  transition: transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.mm-login-ambient-active .mm-login-ambient-drift {
  animation-play-state: running;
}
.mm-login-ambient:not(.mm-login-ambient-active) .mm-login-ambient-pointer {
  transition: none;
}
@keyframes mm-login-drift {
  from {
    transform: translate3d(-10px, -6px, 0);
  }
  to {
    transform: translate3d(8px, 12px, 0);
  }
}
@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
  .mm-login-ambient-drift {
    animation: none;
  }
  .mm-login-ambient-pointer {
    transform: none;
    transition: none;
  }
}
</style>
