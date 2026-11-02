<template>
  <footer class="mm-actions">
    <button
      type="button"
      class="mm-button mm-button-primary"
      :disabled="disableSave"
      @click="emit('save')"
    >
      Salvar filme</button
    ><button type="button" class="mm-button" :disabled="disableCancel" @click="emit('cancel')">
      Cancelar
    </button>
  </footer>
</template>
<script setup lang="ts">
defineProps<{ disableSave?: boolean; disableCancel?: boolean }>();
const emit = defineEmits<{ save: []; cancel: [] }>();
</script>
<style scoped>
.mm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin: 2rem 0;
}
</style>
