<template>
  <div class="mm-disclosure" :class="{ 'mm-disclosure-open': expanded }" @keydown="onKeydown">
    <button
      ref="trigger"
      class="mm-disclosure-trigger"
      type="button"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="expanded = !expanded"
    >
      <span class="mm-disclosure-arrow" aria-hidden="true">›</span>
      <span><slot name="summary" /></span>
    </button>
    <div :id="panelId" class="mm-disclosure-panel" :aria-hidden="!expanded" :inert="!expanded">
      <div class="mm-disclosure-inner"><slot /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
const expanded = ref(false);
const trigger = ref<HTMLButtonElement>();
const panelId = `disclosure-${useId()}`;
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !expanded.value) return;
  event.preventDefault();
  event.stopPropagation();
  expanded.value = false;
  trigger.value?.focus();
}
</script>

<style scoped>
.mm-disclosure-trigger {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  max-width: 100%;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.mm-disclosure-arrow {
  flex: 0 0 auto;
  font-size: 1.2em;
  line-height: 1;
  transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.mm-disclosure-panel {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition:
    grid-template-rows 220ms cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 160ms ease,
    visibility 220ms;
}
.mm-disclosure-inner {
  min-height: 0;
  overflow: hidden;
}
.mm-disclosure-open > .mm-disclosure-trigger .mm-disclosure-arrow {
  transform: rotate(90deg);
}
.mm-disclosure-open > .mm-disclosure-panel {
  grid-template-rows: 1fr;
  opacity: 1;
  visibility: visible;
}
@media (prefers-reduced-motion: reduce) {
  .mm-disclosure-panel,
  .mm-disclosure-arrow {
    transition: none;
  }
}
</style>
