<template>
  <button type="button" class="mm-button" @click.stop.prevent="emit('copy-url', movieId)">
    Copiar link
  </button>
</template>
<script setup lang="ts">
defineProps<{ movieId: number; deleteEnable?: boolean }>();
const emit = defineEmits<{ 'copy-url': [id: number] }>();
</script>
