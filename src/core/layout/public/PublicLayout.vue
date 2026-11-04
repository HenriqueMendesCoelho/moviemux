<script setup lang="ts">
import LanguageSelector from '~/core/i18n/LanguageSelector.vue';
</script>
<template>
  <main class="mm-public">
    <div class="mm-public-language"><LanguageSelector /></div>
    <slot />
  </main>
</template>
<style scoped>
.mm-public-language {
  position: absolute;
  z-index: 5;
  top: 1rem;
  right: 1rem;
}
@media (max-width: 600px) {
  .mm-public-language {
    position: relative;
    display: flex;
    justify-content: flex-end;
    padding: 0.5rem 1rem;
    top: auto;
    right: auto;
  }
}
</style>
