<template>
  <BaseContextMenu
    ><button type="button" class="mm-button" @click="emit('copy-url')">
      Copiar link
    </button></BaseContextMenu
  >
</template>

<script setup lang="ts">
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

const emit = defineEmits<{
  (e: 'copy-url', value: void): void;
}>();
</script>

<style scoped>
.mw-menu {
  min-width: 100px;
}
</style>
