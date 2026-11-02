<template>
  <BaseContextMenu
    ><div class="mm-menu">
      <button type="button" @click.prevent="emit('copy-url')">Copiar URL</button
      ><button type="button" @click.prevent="emit('delete')">Excluir lista</button>
    </div></BaseContextMenu
  >
</template>

<script setup lang="ts">
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

const emit = defineEmits<{
  (e: 'delete', value: void): void;
  (e: 'copy-url', value: void): void;
}>();
</script>
